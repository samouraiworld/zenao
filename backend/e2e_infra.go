package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/goware/prefixer"
)

func newE2EInfraCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "e2e-infra",
			ShortUsage: "e2e-infra",
			ShortHelp:  "start the fullest zenao infra possible for e2e testing and expose management http api for automation",
		},
		&e2eInfraConf,
		func(ctx context.Context, args []string) error {
			return execE2EInfra()
		},
	)
}

var e2eInfraConf e2eInfraConfig

type e2eInfraConfig struct {
	ci bool
}

func (conf *e2eInfraConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.BoolVar(&e2eInfraConf.ci, "ci", false, "Enable CI mode which also starts the web server in production mode")
}

func execE2EInfra() error {
	const dbPath = "e2e.db"

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	ctx, cancelCtx := context.WithCancel(context.Background())
	go func() {
		<-sigs
		cancelCtx()
	}()

	wg := &sync.WaitGroup{}
	defer func() {
		cancelCtx()
		wg.Wait()
	}()

	backendCtx, cancelBackendCtx := context.WithCancel(ctx)
	defer cancelBackendCtx()
	backendDone := make(chan struct{}, 1)

	// gnodev ctx to split from backend ctx to avoid having both wg.Done() executed at same time
	gnodevCtx, cancelGnodevCtx := context.WithCancel(ctx)
	defer cancelGnodevCtx()
	gnodevDone := make(chan struct{}, 1)
	gnodevDone <- struct{}{}

	startBackend := func() error {
		defer func() { backendDone <- struct{}{} }()

		// prepare db
		{
			if err := os.RemoveAll(dbPath); err != nil {
				return err
			}

			args := []string{"atlas", "migrate", "apply", "--dir", "file://migrations", "--env", "e2e"}
			if err := runCommand(backendCtx, "db", "#317738", args); err != nil {
				fmt.Printf("%-10s | db: %v\n", "RUN_ERR", err)
				return err
			}
		}

		// run fakegen with --skip-chain
		{
			args := []string{"go", "run", "./backend", "fakegen", "--events", "10", "--db", dbPath, "--skip-chain"}
			if err := runCommand(backendCtx, "fakegen", "#317738", args); err != nil {
				return err
			}
		}

		// run gentxs
		{
			args := []string{"go", "run", "./backend", "gentxs", "--db", dbPath}
			if err := runCommand(backendCtx, "gentxs", "#317738", args); err != nil {
				return err
			}
		}

		// start backend in background
		{
			args := []string{"go", "run", "./backend", "start", "--db", dbPath}
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := runCommand(backendCtx, "backend", "#C2675E", args); err != nil {
					fmt.Printf("%-10s | backend: %v\n", "RUN_ERR", err)
				}
			}()
		}

		// start gnodev in background using main context
		{
			cancelGnodevCtx()
			<-gnodevDone
			gnodevCtx, cancelGnodevCtx = context.WithCancel(ctx)
			gnodevDone = make(chan struct{}, 1)
			args := []string{"make", "start.gnodev-e2e"}
			wg.Add(1)
			go func() {
				defer func() { wg.Done(); gnodevDone <- struct{}{} }()
				cmd := exec.CommandContext(gnodevCtx, args[0], args[1:]...)
				cmd.Env = append(os.Environ(), "TXS_FILE=genesis_txs.jsonl")
				if err := runCommandWithCmd(gnodevCtx, "gnodev", "#7D56F4", cmd); err != nil {
					fmt.Printf("%-10s | gnodev: %v\n", "RUN_ERR", err)
				}
			}()
		}

		// wait for gnodev to be ready
		if err := waitHTTPStatus(ctx, 60*time.Second, "http://localhost:26657/health", 200); err != nil {
			return err
		}

		// wait for backend to be ready
		if err := waitHTTPStatus(ctx, 60*time.Second, "http://localhost:4242", 404); err != nil {
			return err
		}

		return nil
	}

	if err := startBackend(); err != nil {
		return err
	}

	resetReqJoiner := requestsJoiner{process: func() (int, []byte) {
		fmt.Printf("%-10s | ----------------------------\n", "RESET")
		// reset backend
		cancelBackendCtx()
		<-backendDone
		backendCtx, cancelBackendCtx = context.WithCancel(ctx)
		backendDone = make(chan struct{}, 1)

		if err := startBackend(); err != nil {
			return http.StatusInternalServerError, []byte(err.Error())
		}
		fmt.Printf("%-10s | ----------------------------\n", "READY")

		return http.StatusOK, nil
	}}

	go func() {
		http.DefaultServeMux.Handle("/reset", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			<-resetReqJoiner.req(w)
		}))
		conn, err := net.Listen("tcp", "0.0.0.0:4243")
		if err != nil {
			fmt.Fprintln(os.Stderr, fmt.Errorf("failed to open http server conn: %w", err))
			return
		}
		if err := http.Serve(conn, nil); err != nil {
			fmt.Fprintln(os.Stderr, fmt.Errorf("failed to start http server: %w", err))
			return
		}
	}()

	if !e2eInfraConf.ci {
		fmt.Printf("%-10s | ----------------------------\n", "READY")
		wg.Wait()
		return nil
	}

	// build and run next project in background
	args := []string{"sh", "-c", "npm run build && npm run start"}
	wg.Add(1)
	go func() {
		defer wg.Done()
		go func() {
			if err := runCommand(ctx, "nextjs", "#E1CC4F", args); err != nil {
				fmt.Printf("%-10s | nextjs: %v\n", "RUN_ERR", err)
			}
		}()
	}()

	wg.Wait()
	return nil
}

func waitHTTPStatus(ctx context.Context, timeout time.Duration, url string, status int) error {
	healthCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	client := http.Client{
		Timeout: 1 * time.Second,
	}
	for {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return err
		}
		res, err := client.Do(req)
		if err == nil && res.StatusCode == status {
			return nil
		}
		select {
		case <-healthCtx.Done(): // context cancelled via cancel or deadline
			return fmt.Errorf("failed to wait for service at %q to be ready: %w", url, healthCtx.Err())
		case <-time.After(1 * time.Second): // retry after 1 sec
		}
	}
}

func runCommand(ctx context.Context, name, color string, args []string) error {
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	return runCommandWithCmd(ctx, name, color, cmd)
}

func runCommandWithCmd(ctx context.Context, name, color string, cmd *exec.Cmd) error {
	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#FAFAFA")).
		Background(lipgloss.Color(color))
	streamPrefix := style.Render(fmt.Sprintf("%-10s |", name)) + " "
	wr := prefixStream(os.Stdout, streamPrefix)

	fmt.Fprintln(wr, strings.Join(cmd.Args, " "))

	// prefix log lines
	cmd.Stdout = wr
	cmd.Stderr = prefixStream(os.Stderr, streamPrefix)

	// ensure the command will get terminated if unresponsive
	cmd.WaitDelay = 2 * time.Second

	// kill all children processes and not just parent
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		pgid, err := syscall.Getpgid(cmd.Process.Pid)
		if err != nil {
			return err
		}
		return syscall.Kill(-pgid, syscall.SIGKILL)
	}

	return cmd.Run()
}

func prefixStream(out io.Writer, prefix string) io.Writer {
	rd, wr := io.Pipe()
	pfix := prefixer.New(rd, prefix)
	go func() {
		_, err := io.Copy(out, pfix)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error copying prefixed stream: %v\n", err)
		}
	}()
	return wr
}

// this is used to join reset requests when one is already ongoing
type requestsJoiner struct {
	mu      sync.Mutex
	process func() (int, []byte)
	reqs    []http.ResponseWriter
	chans   []chan struct{}
}

func (r *requestsJoiner) req(w http.ResponseWriter) chan struct{} {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.reqs = append(r.reqs, w)

	doneCh := make(chan struct{}, 1)
	r.chans = append(r.chans, doneCh)

	if len(r.reqs) != 1 {
		return doneCh
	}

	go func() {
		status, body := r.process()

		r.mu.Lock()
		defer r.mu.Unlock()
		for i, w := range r.reqs {
			w.WriteHeader(status)
			_, err := w.Write(body)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error writing response: %v\n", err)
			}
			close(r.chans[i])
		}
		r.reqs = nil
		r.chans = nil
	}()

	return doneCh
}
