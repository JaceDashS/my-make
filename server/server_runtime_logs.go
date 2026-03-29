package main

import (
	"fmt"
	"log"
	"sort"
	"strings"
)

func logServerRuntime(channel, event string, payload map[string]any) {
	logRuntimeEntry("server", channel, event, payload)
}

func logRuntimeEntry(kind, channel, event string, payload map[string]any) {
	label := fmt.Sprintf("[%s/%s]", kind, channel)
	log.Printf("%s %s %s", label, event, formatRuntimePayload(payload))
}

func formatRuntimePayload(payload map[string]any) string {
	if len(payload) == 0 {
		return "{}"
	}

	keys := make([]string, 0, len(payload))
	for key := range payload {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%v", key, payload[key]))
	}

	return strings.Join(parts, " ")
}
