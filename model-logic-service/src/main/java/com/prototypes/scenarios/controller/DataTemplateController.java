package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.DataTemplateDto;
import com.prototypes.scenarios.entity.ScenarioTypeDataTemplate;
import com.prototypes.scenarios.service.ScenarioTypeDataTemplateService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
public class DataTemplateController {

    private final ScenarioTypeDataTemplateService dataTemplateService;

    public DataTemplateController(ScenarioTypeDataTemplateService dataTemplateService) {
        this.dataTemplateService = dataTemplateService;
    }

    @GetMapping("/admin/scenario-types/{code}/data-templates")
    public ResponseEntity<List<DataTemplateDto>> listTemplates(@PathVariable String code) {
        List<DataTemplateDto> result = dataTemplateService.listTemplates(code);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/scenario-types/{code}/data-templates/upload")
    public ResponseEntity<DataTemplateDto> uploadTemplate(
            @PathVariable String code,
            @RequestParam("name") String name,
            @RequestParam("file") MultipartFile file) {
        DataTemplateDto created = dataTemplateService.uploadTemplate(code, name, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/admin/scenario-types/{code}/data-templates/{id}/activate")
    public ResponseEntity<DataTemplateDto> activateTemplate(
            @PathVariable String code,
            @PathVariable UUID id) {
        DataTemplateDto result = dataTemplateService.activateTemplate(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/scenario-types/{code}/data-templates/{id}/deactivate")
    public ResponseEntity<DataTemplateDto> deactivateTemplate(
            @PathVariable String code,
            @PathVariable UUID id) {
        DataTemplateDto result = dataTemplateService.deactivateTemplate(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin/scenario-types/{code}/data-templates/{id}/download")
    public ResponseEntity<byte[]> downloadTemplate(
            @PathVariable String code,
            @PathVariable UUID id) {
        ScenarioTypeDataTemplate entity = dataTemplateService.downloadTemplate(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(entity.getContentType()));
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + entity.getOriginalFilename() + "\"");

        return new ResponseEntity<>(entity.getFileData(), headers, HttpStatus.OK);
    }
}
