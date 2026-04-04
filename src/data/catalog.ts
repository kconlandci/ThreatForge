// ============================================================
// ThreatForge — Lab Catalog
// All lab manifests are imported here and exported as a single array.
// The app reads from this catalog for routing, display, and filtering.
// ============================================================

import type { LabManifest } from "../types/manifest";
import { endpointIsolationLab } from "./labs/endpoint-isolation";
import { portExposureLab } from "./labs/port-exposure";
import { siemAuthLogReviewLab } from "./labs/siem-auth-log-review";
import { webAppVulnerabilityTriageLab } from "./labs/web-app-vulnerability-triage";
import { firewallRuleHardeningLab } from "./labs/firewall-rule-hardening";
import { passwordSprayingDetectionLab } from "./labs/password-spraying-detection";
import { mfaFatigueDefenseLab } from "./labs/mfa-fatigue-defense";
import { networkSegmentationPlanLab } from "./labs/network-segmentation-plan";
import { logHunterLateralMovementLab } from "./labs/log-hunter-lateral-movement";
import { bruteForceSprayDetectionLab } from "./labs/brute-force-spray-detection";
import { phishingEmailTriageLab } from "./labs/phishing-email-triage";
import { suspiciousProcessInvestigationLab } from "./labs/suspicious-process-investigation";
import { accessControlReviewLab } from "./labs/access-control-review";
import { socialEngineeringResponseLab } from "./labs/social-engineering-response";
import { ransomwareContainmentLab } from "./labs/ransomware-containment";
import { cloudIamMisconfigurationLab } from "./labs/cloud-iam-misconfiguration";
import { insiderThreatAssessmentLab } from "./labs/insider-threat-assessment";
import { vulnerabilityPrioritizationLab } from "./labs/vulnerability-prioritization";
import { incidentEscalationJudgmentLab } from "./labs/incident-escalation-judgment";
import { supplyChainRiskAssessmentLab } from "./labs/supply-chain-risk-assessment";
import { privilegeEscalationDetectionLab } from "./labs/privilege-escalation-detection";
import { dnsThreatAnalysisLab } from "./labs/dns-threat-analysis";
import { certificateManagementAuditLab } from "./labs/certificate-management-audit";
import { ssoAuthenticationHardeningLab } from "./labs/sso-authentication-hardening";
import { apiKeyExposureResponseLab } from "./labs/api-key-exposure-response";
import { zeroTrustAccessReviewLab } from "./labs/zero-trust-access-review";
import { cloudContainerSecurityLab } from "./labs/cloud-container-security";
import { dataLossPreventionTriageLab } from "./labs/data-loss-prevention-triage";
import { cloudLoggingInvestigationLab } from "./labs/cloud-logging-investigation";
import { healthcareComplianceIncidentLab } from "./labs/healthcare-compliance-incident";
import { financialTransactionMonitoringLab } from "./labs/financial-transaction-monitoring";
import { endpointHardeningAuditLab } from "./labs/endpoint-hardening-audit";
import { incidentCommunicationJudgmentLab } from "./labs/incident-communication-judgment";
import { mobileDeviceSecurityAssessmentLab } from "./labs/mobile-device-security-assessment";
import { securityPolicyExceptionReviewLab } from "./labs/security-policy-exception-review";
import { emailHeaderForensicsLab } from "./labs/email-header-forensics";
import { wirelessRogueApDetectionLab } from "./labs/wireless-rogue-ap-detection";
import { kubernetesSecurityAuditLab } from "./labs/kubernetes-security-audit";
import { s3BucketExposureLab } from "./labs/s3-bucket-exposure";
import { vpnRemoteAccessHardeningLab } from "./labs/vpn-remote-access-hardening";
import { evilTwinWifiDefenseLab } from "./labs/evil-twin-wifi-defense";
import { kerberoastingDetectionLab } from "./labs/kerberoasting-detection";
import { linuxPrivilegeEscalationLab } from "./labs/linux-privilege-escalation";
import { malwareIndicatorAnalysisLab } from "./labs/malware-indicator-analysis";
import { siemAlertCorrelationLab } from "./labs/siem-alert-correlation";
import { networkTrafficAnalysisLab } from "./labs/network-traffic-analysis";
import { physicalSecurityAssessmentLab } from "./labs/physical-security-assessment";
import { securityAwarenessResponseLab } from "./labs/security-awareness-response";
import { vulnerabilityDisclosureTriageLab } from "./labs/vulnerability-disclosure-triage";
import { databaseSecurityResponseLab } from "./labs/database-security-response";
import { backupDisasterRecoveryLab } from "./labs/backup-disaster-recovery";
import { goldenTicketDetectionLab } from "./labs/golden-ticket-detection";
import { adHardeningReviewLab } from "./labs/ad-hardening-review";
import { accessRecertificationLab } from "./labs/access-recertification";
import { apiSecurityMisconfigurationLab } from "./labs/api-security-misconfiguration";
import { bgpHijackingDetectionLab } from "./labs/bgp-hijacking-detection";
import { changeManagementSecurityLab } from "./labs/change-management-security";
import { cicdPipelineSecurityLab } from "./labs/cicd-pipeline-security";
import { cloudSecurityGroupAuditLab } from "./labs/cloud-security-group-audit";
import { commandInjectionPatternsLab } from "./labs/command-injection-patterns";
import { credentialStuffingDetectionLab } from "./labs/credential-stuffing-detection";
import { dnsCachePoisoningResponseLab } from "./labs/dns-cache-poisoning-response";
import { dockerEscapeDetectionLab } from "./labs/docker-escape-detection";
import { gdprBreachNotificationLab } from "./labs/gdpr-breach-notification";
import { hipaaTechnicalSafeguardsLab } from "./labs/hipaa-technical-safeguards";
import { incidentDocumentationReviewLab } from "./labs/incident-documentation-review";
import { lolbinsDetectionLab } from "./labs/lolbins-detection";
import { oauthTokenTheftDetectionLab } from "./labs/oauth-token-theft-detection";
import { pciDssComplianceGapLab } from "./labs/pci-dss-compliance-gap";
import { powershellObfuscationDetectionLab } from "./labs/powershell-obfuscation-detection";
import { secretsManagementReviewLab } from "./labs/secrets-management-review";
import { soxItControlsReviewLab } from "./labs/sox-it-controls-review";
import { sqlInjectionDetectionLab } from "./labs/sql-injection-detection";
import { ssrfAttackResponseLab } from "./labs/ssrf-attack-response";
import { tlsMisconfigurationAuditLab } from "./labs/tls-misconfiguration-audit";
import { vendorRiskAssessmentLab } from "./labs/vendor-risk-assessment";
import { wafConfigurationReviewLab } from "./labs/waf-configuration-review";
import { xssIdentificationLab } from "./labs/xss-identification";
import { passwordHygieneAuditLab } from "./labs/password-hygiene-audit";
import { wifiSecurityRemoteWorkersLab } from "./labs/wifi-security-remote-workers";
import { phishingLinkAnalysisLab } from "./labs/phishing-link-analysis";
import { browserExtensionSecurityLab } from "./labs/browser-extension-security";
import { usbDropAttackResponseLab } from "./labs/usb-drop-attack-response";
import { shadowItDiscoveryLab } from "./labs/shadow-it-discovery";
import { emailAttachmentSafetyLab } from "./labs/email-attachment-safety";
import { publicWifiThreatAssessmentLab } from "./labs/public-wifi-threat-assessment";
import { socialMediaOsintAwarenessLab } from "./labs/social-media-osint-awareness";
import { qrCodePhishingDetectionLab } from "./labs/qr-code-phishing-detection";
import { deepfakeVoicePhishingLab } from "./labs/deepfake-voice-phishing";
import { aiGeneratedPhishingDetectionLab } from "./labs/ai-generated-phishing-detection";
import { mitreAttackMappingLab } from "./labs/mitre-attack-mapping";
import { threatIntelReportAnalysisLab } from "./labs/threat-intel-report-analysis";
import { redTeamBlueTeamScenarioLab } from "./labs/red-team-blue-team-scenario";
import { socAlertFatigueManagementLab } from "./labs/soc-alert-fatigue-management";
import { forensicImageAnalysisLab } from "./labs/forensic-image-analysis";
import { irTabletopExerciseLab } from "./labs/ir-tabletop-exercise";
import { cloudSecurityPostureAssessmentLab } from "./labs/cloud-security-posture-assessment";
import { zeroDayVulnerabilityResponseLab } from "./labs/zero-day-vulnerability-response";
import { threatHuntingHypothesisLab } from "./labs/threat-hunting-hypothesis";
import { securityArchitectureReviewLab } from "./labs/security-architecture-review";

export const labCatalog: LabManifest[] = [
  endpointIsolationLab,
  portExposureLab,
  siemAuthLogReviewLab,
  webAppVulnerabilityTriageLab,
  firewallRuleHardeningLab,
  passwordSprayingDetectionLab,
  mfaFatigueDefenseLab,
  networkSegmentationPlanLab,
  logHunterLateralMovementLab,
  bruteForceSprayDetectionLab,
  phishingEmailTriageLab,
  suspiciousProcessInvestigationLab,
  accessControlReviewLab,
  socialEngineeringResponseLab,
  ransomwareContainmentLab,
  cloudIamMisconfigurationLab,
  insiderThreatAssessmentLab,
  vulnerabilityPrioritizationLab,
  incidentEscalationJudgmentLab,
  supplyChainRiskAssessmentLab,
  privilegeEscalationDetectionLab,
  dnsThreatAnalysisLab,
  certificateManagementAuditLab,
  ssoAuthenticationHardeningLab,
  apiKeyExposureResponseLab,
  zeroTrustAccessReviewLab,
  cloudContainerSecurityLab,
  dataLossPreventionTriageLab,
  cloudLoggingInvestigationLab,
  healthcareComplianceIncidentLab,
  financialTransactionMonitoringLab,
  endpointHardeningAuditLab,
  incidentCommunicationJudgmentLab,
  mobileDeviceSecurityAssessmentLab,
  securityPolicyExceptionReviewLab,
  emailHeaderForensicsLab,
  wirelessRogueApDetectionLab,
  kubernetesSecurityAuditLab,
  s3BucketExposureLab,
  vpnRemoteAccessHardeningLab,
  evilTwinWifiDefenseLab,
  kerberoastingDetectionLab,
  linuxPrivilegeEscalationLab,
  malwareIndicatorAnalysisLab,
  siemAlertCorrelationLab,
  networkTrafficAnalysisLab,
  physicalSecurityAssessmentLab,
  securityAwarenessResponseLab,
  vulnerabilityDisclosureTriageLab,
  databaseSecurityResponseLab,
  backupDisasterRecoveryLab,
  goldenTicketDetectionLab,
  adHardeningReviewLab,
  accessRecertificationLab,
  apiSecurityMisconfigurationLab,
  bgpHijackingDetectionLab,
  changeManagementSecurityLab,
  cicdPipelineSecurityLab,
  cloudSecurityGroupAuditLab,
  commandInjectionPatternsLab,
  credentialStuffingDetectionLab,
  dnsCachePoisoningResponseLab,
  dockerEscapeDetectionLab,
  gdprBreachNotificationLab,
  hipaaTechnicalSafeguardsLab,
  incidentDocumentationReviewLab,
  lolbinsDetectionLab,
  oauthTokenTheftDetectionLab,
  pciDssComplianceGapLab,
  powershellObfuscationDetectionLab,
  secretsManagementReviewLab,
  soxItControlsReviewLab,
  sqlInjectionDetectionLab,
  ssrfAttackResponseLab,
  tlsMisconfigurationAuditLab,
  vendorRiskAssessmentLab,
  wafConfigurationReviewLab,
  xssIdentificationLab,
  passwordHygieneAuditLab,
  wifiSecurityRemoteWorkersLab,
  phishingLinkAnalysisLab,
  browserExtensionSecurityLab,
  usbDropAttackResponseLab,
  shadowItDiscoveryLab,
  emailAttachmentSafetyLab,
  publicWifiThreatAssessmentLab,
  socialMediaOsintAwarenessLab,
  qrCodePhishingDetectionLab,
  deepfakeVoicePhishingLab,
  aiGeneratedPhishingDetectionLab,
  mitreAttackMappingLab,
  threatIntelReportAnalysisLab,
  redTeamBlueTeamScenarioLab,
  socAlertFatigueManagementLab,
  forensicImageAnalysisLab,
  irTabletopExerciseLab,
  cloudSecurityPostureAssessmentLab,
  zeroDayVulnerabilityResponseLab,
  threatHuntingHypothesisLab,
  securityArchitectureReviewLab,
].sort((a, b) => a.sortOrder - b.sortOrder);
