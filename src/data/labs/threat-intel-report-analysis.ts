import type { LabManifest } from "../../types/manifest";

export const threatIntelReportAnalysisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "threat-intel-report-analysis",
  version: 1,
  title: "Threat Intel Report Analysis",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "threat-intelligence",
    "ioc-analysis",
    "cti",
    "apt",
    "zero-day",
    "indicator-management",
    "relevance-assessment",
  ],

  description:
    "Analyze threat intelligence reports to extract actionable IOCs, assess organizational relevance based on industry targeting and technique overlap, and determine the appropriate operational response posture.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Evaluate threat intelligence report quality, sourcing, and confidence levels",
    "Determine organizational relevance by correlating reported TTPs against your environment's attack surface",
    "Distinguish high-fidelity actionable IOCs from low-value noise indicators",
    "Prioritize defensive actions based on threat imminence and organizational exposure",
    "Apply the Traffic Light Protocol (TLP) and handling caveats to intelligence sharing decisions",
  ],
  sortOrder: 426,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "ti-001",
      title: "APT Group Report — Direct Industry Targeting",
      objective:
        "A TLP:AMBER threat intelligence report from your ISAC describes an APT group actively targeting organizations in your industry sector (financial services). Analyze the report data and decide on the appropriate response posture.",
      investigationData: [
        {
          id: "report-summary",
          label: "Intelligence Report Summary",
          content:
            "Source: FS-ISAC Threat Advisory (TLP:AMBER). APT group tracked as 'Cobalt Viper' has been conducting targeted intrusions against mid-market financial services firms in North America over the past 6 weeks. Group assessed with HIGH confidence to be financially motivated with ties to Eastern European cybercrime ecosystem. Report confidence: HIGH based on incident response engagements at 3 confirmed victim organizations.",
          isCritical: true,
        },
        {
          id: "ttps-overlap",
          label: "TTP Analysis & Environment Overlap",
          content:
            "Reported techniques: T1566.001 (Spearphishing via PDF with embedded links), T1059.001 (PowerShell for C2), T1003.001 (LSASS credential dumping), T1021.001 (RDP lateral movement), T1486 (data encryption for impact). Your environment runs: Exchange Online (email), Microsoft Defender for Endpoint (EDR), Active Directory with LSASS protections NOT enabled, RDP enabled for IT support on 340 endpoints. TTP overlap assessment: 4 of 5 techniques directly applicable to your environment.",
          isCritical: true,
        },
        {
          id: "ioc-list",
          label: "Indicators of Compromise",
          content:
            "Network IOCs: 3 C2 domains (cobalt-cdn[.]com, update-service-ms[.]net, azuredevops-cdn[.]com), 5 IP addresses (listed in appendix, all hosted on bulletproof infrastructure). File IOCs: 2 PDF lure hashes (SHA256), 1 PowerShell loader hash, 1 credential dumping tool hash (modified Mimikatz variant). IOC lifespan assessment: Network infrastructure rotated approximately every 14 days based on historical pattern. Current IOCs are 6 days old.",
        },
        {
          id: "victim-profile",
          label: "Victim Profile Comparison",
          content:
            "Confirmed victims: 3 firms with 200-2,000 employees, all running hybrid AD environments with cloud email. Your organization: 850 employees, hybrid AD, Exchange Online, M365 E5 licensing. Victim similarity score: VERY HIGH. Attack timeline: Initial phishing to ransomware deployment averaged 11 days across confirmed victims.",
        },
        {
          id: "existing-defenses",
          label: "Current Defensive Posture",
          content:
            "Email filtering: Microsoft Defender for Office 365 with Safe Links/Safe Attachments (covers T1566.001 partially). EDR: Defender for Endpoint with standard policy — PowerShell script block logging enabled but no custom detection rules for encoded commands. LSASS protection: Credential Guard NOT enabled (coverage gap for T1003.001). RDP: Network-level access, no jump server architecture (coverage gap for T1021.001).",
        },
      ],
      actions: [
        {
          id: "ACT_IMPLEMENT_IOCS",
          label: "Implement IOCs and harden identified gaps immediately",
          color: "red",
        },
        {
          id: "ACT_MONITOR_ONLY",
          label: "Add IOCs to watchlist — monitor but take no hardening action",
          color: "yellow",
        },
        {
          id: "ACT_NOTE_AWARENESS",
          label: "Note for awareness — no action needed at this time",
          color: "green",
        },
        {
          id: "ACT_SHARE_EXTERNAL",
          label: "Forward the full report to external partners immediately",
          color: "blue",
        },
      ],
      correctActionId: "ACT_IMPLEMENT_IOCS",
      rationales: [
        {
          id: "rat-1",
          text: "The threat is highly relevant: your organization matches the victim profile exactly (industry, size, technology stack), 4 of 5 TTPs apply to your environment, and two critical defensive gaps exist (no LSASS protection, no RDP jump server). With an average 11-day attack timeline and IOCs only 6 days old, the window for proactive defense is narrow but open. Implement IOCs at perimeter, enable Credential Guard for LSASS protection, restrict RDP to jump servers, and create custom EDR rules for encoded PowerShell execution.",
        },
        {
          id: "rat-2",
          text: "Monitoring without hardening is insufficient given the high victim similarity score and confirmed active campaign against your exact industry segment. Passive monitoring means you will only detect the attack after initial compromise rather than preventing it.",
        },
        {
          id: "rat-3",
          text: "This report directly describes a threat actor targeting organizations identical to yours. 'Awareness only' is appropriate for reports with low relevance or low confidence — neither applies here. The FS-ISAC source and confirmed victim engagements establish HIGH confidence.",
        },
        {
          id: "rat-4",
          text: "The report is TLP:AMBER, which restricts sharing to your organization and clients/customers who need to know. Forwarding the full report to external partners without need-to-know assessment would violate TLP handling requirements and could compromise ongoing investigations at victim organizations.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Excellent analysis. You correctly assessed the high organizational relevance based on victim profile matching and TTP overlap, identified the narrow defensive window, and chose the comprehensive response — IOC implementation combined with hardening the specific gaps (LSASS protection and RDP restriction) that the threat actor is known to exploit.",
        partial:
          "You identified some relevance factors, but passive monitoring alone leaves known defensive gaps open during an active campaign targeting your exact profile. When victim similarity is VERY HIGH and TTPs map directly to your environment's weaknesses, proactive hardening is essential.",
        wrong:
          "This report has HIGH confidence from a trusted ISAC source, describes an active campaign against your exact industry and organization profile, and identifies specific defensive gaps in your environment. This demands immediate action, not passive awareness or TLP-violating sharing.",
      },
    },
    {
      type: "investigate-decide",
      id: "ti-002",
      title: "Generic Malware Report — Low Industry Overlap",
      objective:
        "A commercial threat intelligence vendor published a report on a new malware family. Evaluate whether the report warrants operational changes in your environment (healthcare organization).",
      investigationData: [
        {
          id: "report-overview",
          label: "Report Overview",
          content:
            "Source: Commercial TI vendor blog post (TLP:WHITE). Title: 'SteelFox: New Cryptocurrency Mining Malware Distributed via Fake Software Cracks.' Confidence level: MODERATE — based on honeypot captures and limited telemetry. No incident response engagement or confirmed enterprise victims cited. Published 3 days ago.",
        },
        {
          id: "targeting-analysis",
          label: "Targeting & Distribution Analysis",
          content:
            "Distribution vector: Trojanized software crack/keygen downloads from file-sharing forums and torrent sites targeting individual consumers seeking pirated software (AutoCAD, Photoshop, Windows activation tools). No evidence of enterprise-targeted distribution. Victimology: Home users and small businesses with poor software licensing hygiene. No healthcare sector targeting observed.",
        },
        {
          id: "technique-assessment",
          label: "Technique Assessment",
          content:
            "Infection chain: User downloads and executes fake crack → privilege escalation via vulnerable driver (T1068) → installs XMRig cryptominer as a Windows service (T1543.003) → establishes persistence via scheduled task (T1053.005). All techniques require user-initiated execution of untrusted software. Your environment: Enterprise software deployed via SCCM, application whitelisting via AppLocker, users lack local admin rights. Technique applicability: LOW — attack chain requires local admin and user execution of unapproved software, both mitigated by existing controls.",
        },
        {
          id: "ioc-quality",
          label: "IOC Quality Assessment",
          content:
            "Provided IOCs: 14 file hashes (SHA256) for various crack/keygen packages, 2 mining pool addresses, 3 C2 domains on dynamic DNS providers. IOC quality: LOW — hashes are specific to crack packages unlikely to appear in enterprise environments, mining pool addresses are shared infrastructure, dynamic DNS domains have high false-positive risk if added to blocklists. IOC lifespan: Unknown — no historical rotation data available.",
        },
        {
          id: "organizational-context",
          label: "Organizational Context",
          content:
            "Your organization: 2,400-employee regional hospital network. Software deployment: Centralized via SCCM with AppLocker enforcement. User privileges: Standard user (no local admin). Web filtering: Category-based blocking includes file-sharing and torrent sites. Endpoint protection: CrowdStrike Falcon with cryptominer detection module enabled. Current risk posture: Multiple compensating controls already mitigate this threat's attack chain.",
        },
      ],
      actions: [
        {
          id: "ACT_AWARENESS",
          label: "Note for awareness — brief SOC team, no operational changes",
          color: "green",
        },
        {
          id: "ACT_FULL_RESPONSE",
          label: "Implement all IOCs and create custom detection rules",
          color: "red",
        },
        {
          id: "ACT_BLOCK_IOCS",
          label: "Block all provided IOCs at perimeter immediately",
          color: "orange",
        },
        {
          id: "ACT_IGNORE",
          label: "Discard report entirely — no relevance whatsoever",
          color: "blue",
        },
      ],
      correctActionId: "ACT_AWARENESS",
      rationales: [
        {
          id: "rat-1",
          text: "The threat has low organizational relevance: distribution targets consumer piracy users (not enterprise healthcare), the attack chain requires local admin and unapproved software execution (both mitigated by AppLocker and standard user privileges), and existing controls (web filtering, CrowdStrike cryptominer detection) provide compensating coverage. A SOC awareness brief ensures analysts recognize the malware family if it ever appears, without consuming engineering resources on low-quality IOCs.",
        },
        {
          id: "rat-2",
          text: "Implementing all IOCs and custom detection rules for a consumer-targeted cryptominer wastes detection engineering resources. The low-quality IOCs (dynamic DNS, shared mining pools) risk generating false positives that contribute to alert fatigue — a far greater operational risk than the malware itself.",
        },
        {
          id: "rat-3",
          text: "While the threat is low-relevance, completely discarding the report ignores the value of maintaining situational awareness. Threat landscapes evolve, and a future variant could adopt enterprise distribution methods. Briefing the SOC team takes minimal effort and maintains awareness.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Strong prioritization. You correctly assessed the low organizational relevance based on distribution vector mismatch, existing compensating controls, and low IOC quality, while still maintaining situational awareness through a SOC brief. This is exactly how mature CTI programs triage the high volume of published threat reports.",
        partial:
          "Your instinct to act on threat intelligence is good, but resources must be prioritized. Implementing low-quality IOCs from a consumer-targeted campaign risks alert fatigue with minimal security benefit. Consider the full context: distribution vector, technique applicability, and existing control coverage.",
        wrong:
          "This report describes a consumer-targeted cryptominer distributed via pirated software cracks. Your healthcare environment has AppLocker, standard user privileges, and web filtering that collectively mitigate this attack chain. Neither full response nor complete dismissal is appropriate — awareness is the right posture.",
      },
    },
    {
      type: "investigate-decide",
      id: "ti-003",
      title: "Zero-Day Advisory — Active Exploitation in the Wild",
      objective:
        "A CISA emergency directive has been issued for a critical zero-day vulnerability in a product deployed across your environment. Evaluate the advisory and determine the appropriate response urgency and actions.",
      investigationData: [
        {
          id: "advisory-details",
          label: "CISA Emergency Directive",
          content:
            "ED 24-03: Critical zero-day in Ivanti Connect Secure VPN (CVE-2026-XXXX, CVSS 9.8). Authentication bypass allows unauthenticated remote code execution on the VPN gateway appliance. Actively exploited by multiple threat actors including state-sponsored groups. CISA mandates federal agencies apply mitigation within 48 hours. Patch not yet available — vendor has published an XML mitigation configuration.",
          isCritical: true,
        },
        {
          id: "exposure-assessment",
          label: "Organizational Exposure",
          content:
            "Your environment: 2 Ivanti Connect Secure appliances (version 22.7R2.3 — confirmed vulnerable) serving as the primary remote access VPN for 1,200 remote workers. Appliances are internet-facing on standard ports (443). No alternative remote access path exists. Both appliances are in the affected version range specified in the advisory. Shodan scan confirms both appliances are discoverable from the internet.",
          isCritical: true,
        },
        {
          id: "threat-context",
          label: "Threat Actor Context",
          content:
            "Confirmed exploitation by UNC5337 (China-nexus), DEV-0056 (suspected Iran-nexus), and at least 2 unattributed clusters. Exploitation is automated and opportunistic — mass scanning for vulnerable appliances observed from multiple source IP ranges. Time from advisory publication to mass exploitation: estimated at less than 24 hours based on prior Ivanti zero-day patterns (CVE-2024-21887 precedent). Exploitation grants full appliance control including credential harvesting from VPN sessions.",
        },
        {
          id: "mitigation-options",
          label: "Available Mitigations",
          content:
            "Option A: Apply vendor XML mitigation immediately (estimated 30-minute outage per appliance during config push). Option B: Take appliances offline until patch is released (eliminates remote work capability for 1,200 users). Option C: Place appliances behind additional WAF layer and restrict source IPs to known corporate locations. Note: The XML mitigation has been validated by CISA as effective. Vendor patch ETA: 5-7 business days.",
        },
        {
          id: "business-impact",
          label: "Business Impact Assessment",
          content:
            "Remote workforce dependency: 68% of employees work remotely at least 3 days/week. VPN outage impact: Complete loss of access to internal applications, file shares, and development environments. Estimated business impact of extended outage: $180K/day in lost productivity. No VPN alternative (ZTNA/SASE migration planned for Q3 but not yet deployed). Previous 4-hour maintenance windows have been pre-approved by CISO for critical patches.",
        },
      ],
      actions: [
        {
          id: "ACT_IMMEDIATE_MITIGATE",
          label: "Apply XML mitigation immediately during emergency window",
          color: "red",
        },
        {
          id: "ACT_TAKE_OFFLINE",
          label: "Take VPN offline entirely until vendor patch is available",
          color: "orange",
        },
        {
          id: "ACT_WAIT_PATCH",
          label: "Wait for vendor patch — current WAF may provide some protection",
          color: "yellow",
        },
        {
          id: "ACT_MONITOR_EXPLOIT",
          label: "Monitor for exploitation attempts but take no immediate action",
          color: "blue",
        },
      ],
      correctActionId: "ACT_IMMEDIATE_MITIGATE",
      rationales: [
        {
          id: "rat-1",
          text: "A CVSS 9.8 zero-day with confirmed mass exploitation by state-sponsored actors and your appliances confirmed vulnerable and internet-discoverable demands the fastest effective mitigation. The CISA-validated XML mitigation can be applied during a 30-minute emergency window — preserving remote access capability while eliminating the exploitation vector. This balances security urgency with business continuity. Follow up with integrity checks on both appliances to detect any pre-existing compromise, and apply the vendor patch immediately upon release.",
        },
        {
          id: "rat-2",
          text: "Taking appliances fully offline eliminates the vulnerability but at catastrophic business cost ($180K/day) with no alternative remote access. This is only justified if the XML mitigation proves ineffective or if forensic analysis reveals the appliances are already compromised.",
        },
        {
          id: "rat-3",
          text: "Waiting 5-7 business days for a vendor patch while state-sponsored actors are mass-scanning for vulnerable appliances is an unacceptable risk. A WAF provides no reliable protection against an authentication bypass at the application layer. Every hour of delay increases the probability of compromise exponentially given the automated exploitation observed.",
        },
        {
          id: "rat-4",
          text: "Passive monitoring for a CVSS 9.8 zero-day with confirmed active exploitation is negligent. By the time exploitation is detected on your appliances, the attacker will have harvested VPN credentials for all active sessions and potentially established persistence inside the network.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Decisive and well-calibrated response. You recognized the critical urgency of a CVSS 9.8 zero-day under active mass exploitation, applied the CISA-validated mitigation to minimize the exposure window, and preserved business continuity. The 30-minute outage is vastly preferable to either days of lost productivity or an actual compromise.",
        partial:
          "You recognized the severity, but your chosen action either over-corrects (unnecessary full outage when a validated mitigation exists) or under-corrects (waiting introduces unacceptable risk). In zero-day scenarios with confirmed exploitation, apply the fastest validated mitigation and then reassess.",
        wrong:
          "This is a CISA Emergency Directive for a CVSS 9.8 zero-day with confirmed state-sponsored exploitation and your appliances are confirmed vulnerable and internet-facing. Waiting, monitoring, or relying on partial controls is inadequate. Immediate application of the validated mitigation is the only defensible response.",
      },
    },
  ],

  hints: [
    "Assess organizational relevance by mapping three factors: Does the threat actor target your industry? Do the reported TTPs apply to your technology stack? Do your existing controls already mitigate the attack chain? High relevance requires overlap on at least two of these factors.",
    "IOC quality matters as much as IOC quantity. Evaluate IOC lifespan (how quickly the adversary rotates infrastructure), specificity (will this indicator generate false positives?), and source confidence (incident response engagement vs. honeypot capture vs. open-source speculation).",
    "For zero-day advisories, the decision framework is: (1) Am I vulnerable? (2) Is exploitation active? (3) Is a validated mitigation available? If all three are YES, the only variable is how fast you can apply the mitigation while managing business impact.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Cyber Threat Intelligence analysts who can rapidly triage incoming reports, assess organizational relevance, and translate intelligence into defensive action are critical to mature security programs. The ability to separate signal from noise in the constant stream of threat reporting — and to articulate why a specific report does or does not warrant action — is what distinguishes strategic CTI from checkbox intelligence consumption.",

  toolRelevance: [
    "MISP (Malware Information Sharing Platform)",
    "OpenCTI",
    "Recorded Future / Mandiant Advantage",
    "STIX/TAXII feeds",
    "VirusTotal Enterprise",
    "CISA KEV Catalog",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
