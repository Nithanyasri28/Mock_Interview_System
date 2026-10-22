package backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    /** Public endpoint used to check that the server is running. */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "app", "CareerPilot");
    }
}
