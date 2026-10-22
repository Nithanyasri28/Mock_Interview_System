package backend.repository;

import backend.entity.InterviewAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InterviewAnswerRepository extends JpaRepository<InterviewAnswer, Long> {

    @Query("select a from InterviewAnswer a join fetch a.interview i "
            + "where i.user.id = :userId and i.status = 'COMPLETED'")
    List<InterviewAnswer> findCompletedAnswersForUser(@Param("userId") Long userId);
}
