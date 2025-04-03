package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
)

type pageBuild struct {
	kind string
	path string
}

func main() {
	config := map[string]string{}
	configBz, err := os.ReadFile("next-route-config.json")
	assertNoErr(err, "read config")
	assertNoErr(json.Unmarshal(configBz, &config), "unmarshal config")

	scanner := bufio.NewScanner(os.Stdin)
	foundPreamble := false
	pagesLines := false
	builds := []pageBuild{}
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)

		switch {
		case lineIsPagesPreamble(line):
			assert(!foundPreamble, "found pages preamble twice")
			foundPreamble = true
			pagesLines = true

		case pagesLines && lineIsNestedPage(line):
			// do nothing

		case pagesLines && !lineIsPage(line):
			pagesLines = false

		case pagesLines && lineIsPage(line):
			fields := strings.Fields(line)
			assert(len(fields) >= 2, "not enough fields in page line")
			builds = append(builds, pageBuild{kind: fields[1], path: fields[2]})
		}
	}
	assert(foundPreamble, "preamble not found")

	keys := make([]string, len(config))
	i := 0
	for k := range config {
		keys[i] = k
		i++
	}
	slices.Sort(keys)

	errs := []error{}
	for _, key := range keys {
		val := config[key]
		buildIdx := slices.IndexFunc(builds, func(build pageBuild) bool { return build.path == key })
		if buildIdx == -1 {
			errs = append(errs, fmt.Errorf("%s: page not found in build log", key))
			continue
		}
		build := builds[buildIdx]
		if build.kind != val {
			errs = append(errs, fmt.Errorf("%s: expected render %q, got %q", key, val, build.kind))
		}
	}

	if err := errors.Join(errs...); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var pagesPreamble = []string{"Route", "(app)", "Size", "First", "Load", "JS"}

func lineIsPagesPreamble(line string) bool {
	return slices.Equal(pagesPreamble, strings.Fields(line))
}

func lineIsPage(line string) bool {
	return strings.HasPrefix(line, "├ ") || strings.HasPrefix(line, "┌ ") || strings.HasPrefix(line, "└ ")
}

func lineIsNestedPage(line string) bool {
	return strings.HasPrefix(line, "├   ") || strings.HasPrefix(line, "└   ")
}

func assertNoErr(err error, msg string) {
	if err != nil {
		panic(fmt.Errorf("%s: %w", msg, err))
	}
}

func assert(ok bool, msg string) {
	if !ok {
		panic(errors.New(msg))
	}
}
