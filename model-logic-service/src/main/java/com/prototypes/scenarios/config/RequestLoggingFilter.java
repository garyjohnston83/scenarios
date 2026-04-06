package com.prototypes.scenarios.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!(request instanceof HttpServletRequest httpRequest) ||
                !(response instanceof HttpServletResponse httpResponse)) {
            chain.doFilter(request, response);
            return;
        }

        String uri = httpRequest.getRequestURI();

        // Skip actuator paths to avoid noise
        if (uri.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String method = httpRequest.getMethod();
        String queryString = httpRequest.getQueryString();
        String actorId = httpRequest.getHeader("X-Actor-Id");

        String requestLine = method + " " + uri;
        if (queryString != null && !queryString.isEmpty()) {
            requestLine += "?" + queryString;
        }
        if (actorId != null && !actorId.isEmpty()) {
            requestLine += " [actor=" + actorId + "]";
        }

        logger.info("Request: {}", requestLine);

        long startTime = System.currentTimeMillis();

        chain.doFilter(request, response);

        long duration = System.currentTimeMillis() - startTime;
        int status = httpResponse.getStatus();

        logger.info("Response: {} {} status={} duration={}ms", method, uri, status, duration);
    }
}
