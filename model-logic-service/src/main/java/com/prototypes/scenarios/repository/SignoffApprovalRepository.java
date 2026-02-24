package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.SignoffApproval;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SignoffApprovalRepository extends JpaRepository<SignoffApproval, UUID> {
}
