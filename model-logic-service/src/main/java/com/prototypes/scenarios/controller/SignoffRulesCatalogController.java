package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.FactTypeCatalogEntry;
import com.prototypes.scenarios.dto.RoleCatalogEntry;
import com.prototypes.scenarios.service.SignoffRulesCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/signoff-rules")
public class SignoffRulesCatalogController {

    private final SignoffRulesCatalogService catalogService;

    public SignoffRulesCatalogController(SignoffRulesCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/fact-types")
    public ResponseEntity<List<FactTypeCatalogEntry>> getFactTypes() {
        return ResponseEntity.ok(catalogService.getFactTypes());
    }

    @GetMapping("/roles")
    public ResponseEntity<List<RoleCatalogEntry>> getRoles() {
        return ResponseEntity.ok(catalogService.getRoles());
    }
}
