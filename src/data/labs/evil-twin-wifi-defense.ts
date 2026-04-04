import type { LabManifest } from "../../types/manifest";

export const evilTwinWifiDefenseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "evil-twin-wifi-defense",
  version: 1,
  title: "Evil Twin Wi-Fi Defense",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["wireless", "evil-twin", "wifi", "mitm", "social-engineering", "network-security"],

  description:
    "Respond to reports of suspicious Wi-Fi networks near corporate facilities by identifying evil twin attacks, assessing risk to connected users, and taking appropriate defensive action.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Recognize the indicators of an evil twin Wi-Fi attack",
    "Assess the risk of man-in-the-middle attacks via rogue Wi-Fi",
    "Choose appropriate defensive responses for wireless threats",
  ],
  sortOrder: 360,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "et-001",
      title: "Lobby Hotspot Clone",
      context:
        'Security desk reports employees in the lobby are seeing two networks named "CorpNet-Guest". The legitimate guest network uses WPA2-Enterprise, but the duplicate is an open network with a significantly stronger signal. Three employee phones have auto-connected to the open version.',
      displayFields: [
        { label: "Legitimate SSID", value: "CorpNet-Guest (WPA2-Enterprise)", emphasis: "normal" },
        { label: "Rogue SSID", value: "CorpNet-Guest (Open/No Auth)", emphasis: "critical" },
        { label: "Rogue Signal", value: "-35dBm (stronger than legitimate -55dBm)", emphasis: "warn" },
        { label: "Connected Devices", value: "3 corporate phones auto-connected", emphasis: "critical" },
        { label: "Location", value: "Main lobby, near visitor seating", emphasis: "normal" },
      ],
      actions: [
        {
          id: "ALERT_LOCATE",
          label: "Alert connected users and physically locate rogue device",
          color: "red",
        },
        {
          id: "RENAME_CORP",
          label: "Rename the corporate network to avoid confusion",
          color: "yellow",
        },
        {
          id: "BLOCK_MAC",
          label: "Block the rogue AP's MAC address at the switch",
          color: "orange",
        },
        {
          id: "WAIT_MONITOR",
          label: "Monitor for 24 hours before acting",
          color: "blue",
        },
      ],
      correctActionId: "ALERT_LOCATE",
      rationales: [
        {
          id: "rat-alert",
          text: "The open duplicate with a stronger signal is designed to lure auto-connecting devices. Alerting connected users stops credential exposure immediately, and physically locating the device removes the threat permanently.",
        },
        {
          id: "rat-rename",
          text: "Renaming the corporate network disrupts all legitimate connections and doesn't address the rogue AP still active in the lobby.",
        },
        {
          id: "rat-mac",
          text: "The rogue AP may not be on the corporate wired network — blocking its MAC at the switch would have no effect if it's using its own internet connection.",
        },
        {
          id: "rat-wait",
          text: "Every minute of delay means employee credentials and traffic are being intercepted by the attacker's device.",
        },
      ],
      correctRationaleId: "rat-alert",
      feedback: {
        perfect: "Correct. The open duplicate with stronger signal is a classic evil twin. Alerting users stops the immediate data exposure while physical location eliminates the threat.",
        partial: "You identified the threat but your response doesn't fully address it. Connected devices need immediate warning, and the rogue device needs to be physically found.",
        wrong: "Waiting or renaming the corporate network leaves employees exposed to active interception. Evil twin attacks require immediate response.",
      },
    },
    {
      type: "action-rationale",
      id: "et-002",
      title: "Conference Event AP",
      context:
        'An external company hosting an event in the shared conference center set up their own Wi-Fi access point with the SSID "CorpConf-WiFi", which is similar to your "CorpNet-Conference" SSID. Attendees are confused about which network to join. The event AP is properly isolated on a separate internet connection.',
      displayFields: [
        { label: "Corporate SSID", value: "CorpNet-Conference (WPA3)", emphasis: "normal" },
        { label: "Event SSID", value: "CorpConf-WiFi (WPA2-PSK)", emphasis: "warn" },
        { label: "Event AP Status", value: "Verified event equipment, separate ISP", emphasis: "normal" },
        { label: "Network Isolation", value: "Not on corporate network", emphasis: "normal" },
        { label: "User Impact", value: "Some employees joined wrong network", emphasis: "warn" },
      ],
      actions: [
        {
          id: "COORDINATE_RENAME",
          label: "Coordinate with event organizers to rename their SSID",
          color: "green",
        },
        {
          id: "DEAUTH_EVENT",
          label: "Send deauth frames to disrupt the event AP",
          color: "red",
        },
        {
          id: "BLOCK_EMPLOYEES",
          label: "Push MDM policy blocking the event SSID",
          color: "orange",
        },
        {
          id: "QUARANTINE_AP",
          label: "Confiscate the event AP",
          color: "yellow",
        },
      ],
      correctActionId: "COORDINATE_RENAME",
      rationales: [
        {
          id: "rat-coordinate",
          text: "The event AP is legitimate, isolated, and not a security threat. The naming similarity is causing user confusion, which is best resolved through professional coordination rather than aggressive technical action.",
        },
        {
          id: "rat-deauth",
          text: "Sending deauthentication frames against a legitimate network is potentially illegal and would disrupt a business event.",
        },
        {
          id: "rat-mdm",
          text: "Pushing an MDM policy is heavy-handed for a temporary naming conflict and creates unnecessary device management overhead.",
        },
        {
          id: "rat-confiscate",
          text: "Confiscating legitimate event equipment would create a business conflict and is not justified by the risk level.",
        },
      ],
      correctRationaleId: "rat-coordinate",
      feedback: {
        perfect: "Well judged. Not every similar SSID is an attack. The event AP is verified, isolated, and legitimate. Professional coordination resolves the naming conflict appropriately.",
        partial: "Your caution is understandable but the response is disproportionate. This is a naming conflict, not an attack. Aggressive actions damage business relationships.",
        wrong: "Deauthenticating or confiscating legitimate equipment is both unprofessional and potentially illegal. Assess the actual risk before taking aggressive action.",
      },
    },
    {
      type: "action-rationale",
      id: "et-003",
      title: "Deauthentication Attack in Parking Lot",
      context:
        'Multiple employees near the parking lot entrance report their phones keep disconnecting from "CorpNet-Secure" and reconnecting to an unknown open network. WIDS shows a flood of deauthentication frames originating from near the parking structure. An unknown AP with the corporate SSID appeared 10 minutes ago.',
      displayFields: [
        { label: "Attack Type", value: "Deauth flood + evil twin", emphasis: "critical" },
        { label: "Deauth Frames", value: "4,200 frames in 10 minutes", emphasis: "critical" },
        { label: "Rogue AP", value: "Corporate SSID, open auth, parking lot area", emphasis: "critical" },
        { label: "Affected Users", value: "~15 devices disconnected and reconnecting", emphasis: "warn" },
        { label: "WIDS Source", value: "Signal triangulation points to parking structure Level 2", emphasis: "warn" },
      ],
      actions: [
        {
          id: "CONTAIN_INVESTIGATE",
          label: "Block rogue MAC, issue company alert, dispatch security to location",
          color: "red",
        },
        {
          id: "DISABLE_WIFI",
          label: "Disable all corporate Wi-Fi temporarily",
          color: "orange",
        },
        {
          id: "EMAIL_WARNING",
          label: "Send email warning about suspicious Wi-Fi",
          color: "yellow",
        },
        {
          id: "IGNORE_NORMAL",
          label: "Interference is normal near parking structures",
          color: "blue",
        },
      ],
      correctActionId: "CONTAIN_INVESTIGATE",
      rationales: [
        {
          id: "rat-active-attack",
          text: "The combination of deauthentication flood and a simultaneous evil twin AP is a coordinated active attack. Blocking the rogue MAC contains wirelessly, the company alert protects users, and dispatching security enables physical containment and evidence collection.",
        },
        {
          id: "rat-disable-all",
          text: "Disabling all corporate Wi-Fi causes organization-wide disruption and doesn't address the attacker's AP, which will continue to lure devices.",
        },
        {
          id: "rat-email",
          text: "An email warning is too slow for an active attack — affected users may not check email while their devices are actively being compromised.",
        },
        {
          id: "rat-ignore",
          text: "4,200 deauth frames in 10 minutes is not normal interference. This is a deliberate attack pattern that requires immediate response.",
        },
      ],
      correctRationaleId: "rat-active-attack",
      feedback: {
        perfect: "Excellent response. Deauth flood + evil twin is a coordinated attack requiring multi-pronged response: wireless containment, user notification, and physical investigation simultaneously.",
        partial: "You recognized the threat but your response doesn't cover all bases. An active deauth attack needs wireless containment, user alerts, AND physical investigation together.",
        wrong: "Ignoring or under-responding to an active deauth + evil twin attack leaves employees exposed to credential theft and man-in-the-middle interception.",
      },
    },
  ],

  hints: [
    "An open network with the same SSID as a corporate WPA2/WPA3 network is a classic evil twin indicator.",
    "Not every similar SSID is an attack — verify the source and assess whether it's on your network before taking aggressive action.",
    "Deauthentication floods combined with a rogue AP indicate a coordinated active attack requiring immediate multi-layer response.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Evil twin attacks are one of the most common physical proximity attacks. Security professionals use wireless IDS and 802.1X/EAP-TLS to detect and prevent them automatically.",
  toolRelevance: [
    "Kismet",
    "Wireshark",
    "Aircrack-ng (defensive testing)",
    "802.1X/RADIUS",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
