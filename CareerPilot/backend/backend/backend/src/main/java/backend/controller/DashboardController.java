package backend.controller;

import backend.dto.AnalyticsDtos.AnalyticsResponse;
import backend.dto.AnalyticsDtos.DashboardResponse;
import backend.service.AnalyticsService;
import backend.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
public class DashboardController {

    private final AnalyticsService analyticsService;
    private final UserService userService;

    public DashboardController(AnalyticsService analyticsService, UserService userService) {
        this.analyticsService = analyticsService;
        this.userService = userService;
    }

    @GetMapping("/api/dashboard")
    public DashboardResponse dashboard(Principal principal) {
        return analyticsService.dashboard(userService.requireByEmail(principal.getName()));
    }

    @GetMapping("/api/analytics")
    public AnalyticsResponse analytics(Principal principal) {
        return analyticsService.analytics(userService.requireByEmail(principal.getName()));
    }
}
