package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.UserRef;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRefRepository extends JpaRepository<UserRef, String> {
}
