package backend.repository;

import backend.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    List<Interview> findByUserIdOrderByStartedAtDesc(Long userId);

    List<Interview> findByUserIdAndStatusOrderByCompletedAtAsc(Long userId, String status);

    List<Interview> findByUserIdAndStatus(Long userId, String status);

    /** Always look interviews up together with the owner id so users only see their own data. */
    Optional<Interview> findByIdAndUserId(Long id, Long userId);

    Optional<Interview> findFirstByUserIdAndStatusOrderByStartedAtDesc(Long userId, String status);
}
