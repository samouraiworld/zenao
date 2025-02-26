package main

import (
	"context"
	"flag"
	"fmt"
	"io"
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
	flset.BoolVar(&e2eInfraConf.ci, "ci", false, "Enable CI mode which runs cypress tests automatically")
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

	// prepare db
	{
		if err := os.RemoveAll(dbPath); err != nil {
			return err
		}

		args := []string{"atlas", "migrate", "apply", "--dir", "file://migrations", "--env", "e2e"}
		if err := runCommand(ctx, "db", "#317738", args); err != nil {
			return err
		}
	}

	// start gnodev in background
	{
		args := []string{"make", "start.gnodev-e2e"}
		wg.Add(1)
		go func() {
			defer wg.Done()
			runCommand(ctx, "gnodev", "#7D56F4", args)
		}()
	}

	// start backend in background
	{
		args := []string{"go", "run", "./backend", "start", "--db", dbPath}
		wg.Add(1)
		go func() {
			defer wg.Done()
			go runCommand(ctx, "backend", "#C2675E", args)
		}()
	}

	// XXX: backend should be ready before gnodev but it would be better to check the connection

	// wait for gnodev to be ready
	if err := waitHTTPOK(ctx, 60*time.Second, "http://localhost:26657/health"); err != nil {
		return err
	}

	// run fakegen
	{
		args := []string{"go", "run", "./backend", "fakegen", "--events", "5", "--db", dbPath}
		if err := runCommand(ctx, "fakegen", "#317738", args); err != nil {
			return err
		}
	}

	if !e2eInfraConf.ci {
		fmt.Println("READY   | ----------------------------")
		wg.Wait()
		return nil
	}

	// build and run next project in background
	args := []string{"sh", "-c", "npm ci && npm run build && npm run start"}
	wg.Add(1)
	go func() {
		defer wg.Done()
		go runCommand(ctx, "nextjs", "#E1CC4F", args)
	}()

	wg.Wait()
	return nil
}

func waitHTTPOK(ctx context.Context, timeout time.Duration, url string) error {
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
		if err == nil && res.StatusCode == 200 {
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
	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#FAFAFA")).
		Background(lipgloss.Color(color))
	streamPrefix := style.Render(fmt.Sprintf("%-10s |", name)) + " "
	wr := prefixStream(os.Stdout, streamPrefix)

	fmt.Fprintln(wr, strings.Join(args, " "))
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	cmd.Stdout = wr
	cmd.Stderr = prefixStream(os.Stderr, streamPrefix)
	cmd.WaitDelay = 2 * time.Second
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
	go io.Copy(out, pfix)
	return wr
}
