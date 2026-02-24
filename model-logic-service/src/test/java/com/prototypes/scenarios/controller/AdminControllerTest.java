package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.entity.ScenarioType;
import com.prototypes.scenarios.entity.SignoffPolicy;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SignoffPolicyRepository signoffPolicyRepository;

    @MockitoBean
    private ScenarioTypeRepository scenarioTypeRepository;

    private static final UUID POLICY_ID_1 = UUID.fromString("aa111111-1111-1111-1111-111111111111");
    private static final UUID POLICY_ID_2 = UUID.fromString("aa222222-2222-2222-2222-222222222222");
    private static final LocalDateTime FIXED_TIME = LocalDateTime.of(2026, 2, 22, 10, 0, 0);

    private SignoffPolicy buildPolicy(UUID id, String scenarioTypeCode, String name,
                                      int requiredApproverCount, boolean isEnabled, int priority) {
        SignoffPolicy policy = new SignoffPolicy();
        policy.setId(id);
        policy.setScenarioTypeCode(scenarioTypeCode);
        policy.setName(name);
        policy.setRequiredApproverCount(requiredApproverCount);
        policy.setEnabled(isEnabled);
        policy.setPriority(priority);
        policy.setCreatedAt(FIXED_TIME);
        policy.setUpdatedAt(FIXED_TIME);
        return policy;
    }

    // Test 1: GET /admin/signoff-policies returns all policies
    @Test
    void getSignoffPolicies_noFilter_returnsAllPolicies() throws Exception {
        SignoffPolicy policy1 = buildPolicy(POLICY_ID_1, "MARKET_DATA", "Default Market Data Policy", 2, true, 1);
        SignoffPolicy policy2 = buildPolicy(POLICY_ID_2, "RISK_FACTOR", "Default Risk Factor Policy", 3, true, 1);

        when(signoffPolicyRepository.findAll()).thenReturn(List.of(policy1, policy2));

        mockMvc.perform(get("/admin/signoff-policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(POLICY_ID_1.toString())))
                .andExpect(jsonPath("$[0].scenarioTypeCode", is("MARKET_DATA")))
                .andExpect(jsonPath("$[0].name", is("Default Market Data Policy")))
                .andExpect(jsonPath("$[0].requiredApproverCount", is(2)))
                .andExpect(jsonPath("$[0].priority", is(1)))
                .andExpect(jsonPath("$[1].id", is(POLICY_ID_2.toString())))
                .andExpect(jsonPath("$[1].scenarioTypeCode", is("RISK_FACTOR")))
                .andExpect(jsonPath("$[1].name", is("Default Risk Factor Policy")))
                .andExpect(jsonPath("$[1].requiredApproverCount", is(3)));
    }

    // Test 2: GET /admin/signoff-policies?scenarioTypeCode=MARKET_DATA returns filtered results
    @Test
    void getSignoffPolicies_filteredByScenarioTypeCode_returnsFilteredResults() throws Exception {
        SignoffPolicy policy1 = buildPolicy(POLICY_ID_1, "MARKET_DATA", "Default Market Data Policy", 2, true, 1);

        when(signoffPolicyRepository.findAllByScenarioTypeCode("MARKET_DATA"))
                .thenReturn(List.of(policy1));

        mockMvc.perform(get("/admin/signoff-policies").param("scenarioTypeCode", "MARKET_DATA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(POLICY_ID_1.toString())))
                .andExpect(jsonPath("$[0].scenarioTypeCode", is("MARKET_DATA")))
                .andExpect(jsonPath("$[0].name", is("Default Market Data Policy")));
    }

    // Test 3: POST /admin/signoff-policies creates a policy and returns 201 with SignoffPolicyDto
    @Test
    void createSignoffPolicy_validRequest_returns201WithCreatedPolicy() throws Exception {
        when(scenarioTypeRepository.existsById("MARKET_DATA")).thenReturn(true);
        when(signoffPolicyRepository.save(any(SignoffPolicy.class))).thenAnswer(invocation -> {
            SignoffPolicy saved = invocation.getArgument(0);
            return saved;
        });

        mockMvc.perform(post("/admin/signoff-policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "New Market Data Policy",
                                    "scenarioTypeCode": "MARKET_DATA",
                                    "requiredApproverCount": 3,
                                    "isEnabled": true,
                                    "priority": 2
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("New Market Data Policy")))
                .andExpect(jsonPath("$.scenarioTypeCode", is("MARKET_DATA")))
                .andExpect(jsonPath("$.requiredApproverCount", is(3)))
                .andExpect(jsonPath("$.priority", is(2)))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    // Test 4: POST /admin/signoff-policies with invalid scenarioTypeCode returns error
    @Test
    void createSignoffPolicy_invalidScenarioTypeCode_returns400() throws Exception {
        when(scenarioTypeRepository.existsById("INVALID_TYPE")).thenReturn(false);

        mockMvc.perform(post("/admin/signoff-policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Invalid Policy",
                                    "scenarioTypeCode": "INVALID_TYPE",
                                    "requiredApproverCount": 2,
                                    "isEnabled": true,
                                    "priority": 1
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    // Test 5: PUT /admin/signoff-policies/{id} updates a policy and returns updated SignoffPolicyDto
    @Test
    void updateSignoffPolicy_existingId_returns200WithUpdatedPolicy() throws Exception {
        SignoffPolicy existing = buildPolicy(POLICY_ID_1, "MARKET_DATA", "Old Name", 2, true, 1);

        when(signoffPolicyRepository.findById(POLICY_ID_1)).thenReturn(Optional.of(existing));
        when(signoffPolicyRepository.save(any(SignoffPolicy.class))).thenAnswer(invocation -> {
            SignoffPolicy saved = invocation.getArgument(0);
            return saved;
        });

        mockMvc.perform(put("/admin/signoff-policies/{id}", POLICY_ID_1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Updated Name",
                                    "requiredApproverCount": 5,
                                    "isEnabled": false,
                                    "priority": 3
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(POLICY_ID_1.toString())))
                .andExpect(jsonPath("$.scenarioTypeCode", is("MARKET_DATA")))
                .andExpect(jsonPath("$.name", is("Updated Name")))
                .andExpect(jsonPath("$.requiredApproverCount", is(5)))
                .andExpect(jsonPath("$.priority", is(3)))
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    // Test 6: PUT /admin/signoff-policies/{nonexistent-id} returns 404
    @Test
    void updateSignoffPolicy_nonexistentId_returns404() throws Exception {
        UUID nonexistentId = UUID.fromString("ff999999-9999-9999-9999-999999999999");

        when(signoffPolicyRepository.findById(nonexistentId)).thenReturn(Optional.empty());

        mockMvc.perform(put("/admin/signoff-policies/{id}", nonexistentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Some Name",
                                    "requiredApproverCount": 2,
                                    "isEnabled": true,
                                    "priority": 1
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    // ========================================================================
    // Increment 12, Task Group 6: Gap Tests
    // ========================================================================

    // Gap Test: GET /admin/signoff-policies with no policies returns 200 with empty list
    @Test
    void getSignoffPolicies_noPolicies_returnsEmptyList() throws Exception {
        when(signoffPolicyRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/admin/signoff-policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
