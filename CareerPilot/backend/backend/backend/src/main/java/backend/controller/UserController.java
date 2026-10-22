package backend.controller;

import backend.config.JwtUtil;
import backend.dto.AuthDtos.*;
import backend.entity.User;
import backend.service.EmailService;
import backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public UserController(UserService userService, JwtUtil jwtUtil, EmailService emailService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        emailService.sendWelcome(user.getEmail(), user.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse("Registration successful. Please log in.", userService.toResponse(user)));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        User user = userService.authenticate(request.email(), request.password());
        return new AuthResponse(jwtUtil.generateToken(user.getEmail()), userService.toResponse(user));
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return userService.toResponse(userService.requireByEmail(principal.getName()));
    }

    @PutMapping("/me")
    public ProfileUpdateResponse updateMe(Principal principal, @Valid @RequestBody UpdateProfileRequest request) {
        User user = userService.requireByEmail(principal.getName());
        String oldEmail = user.getEmail();
        User saved = userService.updateProfile(user, request);
        String newToken = saved.getEmail().equalsIgnoreCase(oldEmail) ? null : jwtUtil.generateToken(saved.getEmail());
        return new ProfileUpdateResponse(userService.toResponse(saved), newToken);
    }
}
