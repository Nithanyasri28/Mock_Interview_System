package backend.controller;

import backend.dto.InterviewDtos.*;
import backend.service.InterviewService;
import backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;
    private final UserService userService;

    public InterviewController(InterviewService interviewService, UserService userService) {
        this.interviewService = interviewService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<InterviewSession> create(Principal principal,
                                                   @Valid @RequestBody CreateInterviewRequest request) {
        InterviewSession session = interviewService.create(userService.requireByEmail(principal.getName()), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    /** History list. Defaults to COMPLETED interviews. */
    @GetMapping
    public List<InterviewSummary> list(Principal principal,
                                       @RequestParam(required = false) String status,
                                       @RequestParam(required = false) String search,
                                       @RequestParam(required = false) String role,
                                       @RequestParam(required = false) String type,
                                       @RequestParam(required = false) String difficulty,
                                       @RequestParam(required = false, defaultValue = "date") String sort,
                                       @RequestParam(required = false, defaultValue = "desc") String order) {
        return interviewService.list(userService.requireByEmail(principal.getName()),
                status, search, role, type, difficulty, sort, order);
    }

    /** The user's unfinished interview, for session recovery. 204 when there is none. */
    @GetMapping("/active")
    public ResponseEntity<InterviewSession> active(Principal principal) {
        return interviewService.active(userService.requireByEmail(principal.getName()))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public InterviewDetail get(Principal principal, @PathVariable Long id) {
        return interviewService.get(userService.requireByEmail(principal.getName()), id);
    }

    @PutMapping("/{id}/answers/{order}")
    public AnswerSaved saveAnswer(Principal principal, @PathVariable Long id, @PathVariable int order,
                                  @Valid @RequestBody SubmitAnswerRequest request) {
        return interviewService.saveAnswer(userService.requireByEmail(principal.getName()), id, order, request);
    }

    @PostMapping("/{id}/complete")
    public InterviewResult complete(Principal principal, @PathVariable Long id,
                                    @Valid @RequestBody(required = false) CompleteRequest request) {
        return interviewService.complete(userService.requireByEmail(principal.getName()), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        interviewService.delete(userService.requireByEmail(principal.getName()), id);
        return ResponseEntity.noContent().build();
    }
}
