// Package logging gives every component a named slog logger, rendering lines in
// the same shape the TS side's winston format produced:
//
//	2026-09-01 12:00:00.000 INFO  [ServerProcessor] Processed batch rows=42
package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"
)

const componentKey = "component"

var (
	root  *slog.Logger
	level = new(slog.LevelVar)
)

func init() {
	level.Set(slog.LevelInfo)
	root = slog.New(&handler{w: os.Stdout, mu: &sync.Mutex{}, level: level})
}

// Init sets the global level from LOG_LEVEL.  Unknown values keep info, which
// is what winston does with a level it does not recognise.
func Init(logLevel string) {
	switch strings.ToLower(strings.TrimSpace(logLevel)) {
	case "debug", "verbose", "silly", "trace":
		level.Set(slog.LevelDebug)
	case "warn", "warning":
		level.Set(slog.LevelWarn)
	case "error":
		level.Set(slog.LevelError)
	default:
		level.Set(slog.LevelInfo)
	}
}

// New returns a logger tagged with a component name, the equivalent of
// createLogger('ServerProcessor').
func New(component string) *slog.Logger {
	return root.With(slog.String(componentKey, component))
}

// Enabled reports whether a level would be written, so callers can skip
// building an expensive debug message.
func Enabled(l slog.Level) bool { return level.Level() <= l }

type handler struct {
	w     io.Writer
	mu    *sync.Mutex
	level *slog.LevelVar
	attrs []slog.Attr
}

func (h *handler) Enabled(_ context.Context, l slog.Level) bool {
	return l >= h.level.Level()
}

func (h *handler) Handle(_ context.Context, r slog.Record) error {
	var sb strings.Builder
	sb.WriteString(r.Time.Format("2006-01-02 15:04:05.000"))
	sb.WriteString(" ")
	sb.WriteString(fmt.Sprintf("%-5s", r.Level.String()))

	attrs := make([]slog.Attr, 0, len(h.attrs)+r.NumAttrs())
	component := ""
	for _, a := range h.attrs {
		if a.Key == componentKey {
			component = a.Value.String()
			continue
		}
		attrs = append(attrs, a)
	}
	r.Attrs(func(a slog.Attr) bool {
		if a.Key == componentKey {
			component = a.Value.String()
			return true
		}
		attrs = append(attrs, a)
		return true
	})

	if component != "" {
		sb.WriteString(" [")
		sb.WriteString(component)
		sb.WriteString("]")
	}
	sb.WriteString(" ")
	sb.WriteString(r.Message)

	for _, a := range attrs {
		sb.WriteString(" ")
		sb.WriteString(a.Key)
		sb.WriteString("=")
		sb.WriteString(quote(a.Value))
	}
	sb.WriteString("\n")

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := io.WriteString(h.w, sb.String())
	return err
}

func (h *handler) WithAttrs(attrs []slog.Attr) slog.Handler {
	merged := make([]slog.Attr, 0, len(h.attrs)+len(attrs))
	merged = append(merged, h.attrs...)
	merged = append(merged, attrs...)
	return &handler{w: h.w, mu: h.mu, level: h.level, attrs: merged}
}

// Groups are unused; keeping the handler flat keeps the lines readable.
func (h *handler) WithGroup(string) slog.Handler { return h }

func quote(v slog.Value) string {
	switch v.Kind() {
	case slog.KindString:
		s := v.String()
		if s == "" || strings.ContainsAny(s, " \t\"=") {
			return fmt.Sprintf("%q", s)
		}
		return s
	case slog.KindDuration:
		return v.Duration().String()
	case slog.KindTime:
		return v.Time().Format(time.RFC3339Nano)
	case slog.KindAny:
		if err, ok := v.Any().(error); ok {
			return fmt.Sprintf("%q", err.Error())
		}
		return fmt.Sprintf("%q", fmt.Sprint(v.Any()))
	default:
		return v.String()
	}
}
