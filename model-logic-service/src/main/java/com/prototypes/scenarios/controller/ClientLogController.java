package com.prototypes.scenarios.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/client-logs")
public class ClientLogController {

    private static final Logger clientLogger = LoggerFactory.getLogger("CLIENT_LOG");

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void receiveClientLogs(@RequestBody List<ClientLogEntry> entries) {
        for (ClientLogEntry entry : entries) {
            String formattedMessage = formatLogMessage(entry);

            switch (entry.level != null ? entry.level.toUpperCase() : "INFO") {
                case "DEBUG" -> clientLogger.debug(formattedMessage);
                case "WARN" -> clientLogger.warn(formattedMessage);
                case "ERROR" -> clientLogger.error(formattedMessage);
                default -> clientLogger.info(formattedMessage);
            }
        }
    }

    private String formatLogMessage(ClientLogEntry entry) {
        StringBuilder sb = new StringBuilder();
        if (entry.module != null && !entry.module.isEmpty()) {
            sb.append("[").append(entry.module).append("] ");
        }
        if (entry.timestamp != null && !entry.timestamp.isEmpty()) {
            sb.append("(").append(entry.timestamp).append(") ");
        }
        sb.append(entry.message != null ? entry.message : "");
        if (entry.context != null && !entry.context.isEmpty()) {
            sb.append(" context=").append(entry.context);
        }
        return sb.toString();
    }

    public static class ClientLogEntry {
        public String level;
        public String message;
        public String module;
        public String timestamp;
        public Map<String, Object> context;
    }
}
