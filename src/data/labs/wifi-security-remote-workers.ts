import type { LabManifest } from "../../types/manifest";

export const wifiSecurityRemoteWorkersLab: LabManifest = {
  schemaVersion: "1.1",
  id: "wifi-security-remote-workers",
  version: 1,
  title: "Wi-Fi Security for Remote Workers",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "wifi",
    "wpa3",
    "vpn",
    "remote-work",
    "home-network",
    "network-segmentation",
    "router-hardening",
  ],

  description:
    "Configure home router, VPN, and network segmentation settings to secure a remote worker's environment against common wireless threats and data exposure.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Apply WPA3 and router hardening best practices to home networks",
    "Evaluate VPN split-tunnel configurations for security trade-offs",
    "Segment personal and corporate devices on separate network zones",
  ],
  sortOrder: 402,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "wifi-001",
      title: "Home Router Hardening",
      description:
        "A newly onboarded remote employee is using a consumer-grade home router with factory defaults. Review and correct the router settings to meet corporate remote-work security policy before granting VPN access.",
      targetSystem: "Home Router — Netgear R7000 (Firmware 1.0.11.126)",
      items: [
        {
          id: "wifi-encryption",
          label: "Wireless Security Protocol",
          detail:
            "The router is currently using WPA2-Personal (TKIP) for backward compatibility with older devices. Corporate policy requires the strongest available encryption.",
          currentState: "WPA2-Personal (TKIP)",
          correctState: "WPA3-Personal (SAE)",
          states: [
            "Open (No Encryption)",
            "WEP",
            "WPA2-Personal (TKIP)",
            "WPA2-Personal (AES)",
            "WPA3-Personal (SAE)",
          ],
          rationaleId: "rat-wpa3",
        },
        {
          id: "ssid-broadcast",
          label: "SSID Broadcast",
          detail:
            "The network name is currently broadcasting openly. Some guides recommend hiding the SSID for security, but this can cause connectivity issues and provides minimal real protection.",
          currentState: "Hidden",
          correctState: "Visible",
          states: ["Visible", "Hidden"],
          rationaleId: "rat-ssid",
        },
        {
          id: "admin-password",
          label: "Router Admin Password",
          detail:
            "The router admin panel is accessible at 192.168.1.1 with the factory default credentials (admin/password). This must be changed before the device connects to corporate resources.",
          currentState: "Default (admin/password)",
          correctState: "Strong Unique Password",
          states: [
            "Default (admin/password)",
            "Simple Password (router123)",
            "Strong Unique Password",
          ],
          rationaleId: "rat-admin-pw",
        },
        {
          id: "remote-management",
          label: "Remote Management (WAN Access)",
          detail:
            "Remote management allows the router admin panel to be accessed from the internet. This is currently enabled for convenience when the employee travels.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-remote-mgmt",
        },
      ],
      rationales: [
        {
          id: "rat-wpa3",
          text: "WPA3-Personal uses Simultaneous Authentication of Equals (SAE), which eliminates offline dictionary attacks possible against WPA2's 4-way handshake. TKIP is deprecated and vulnerable to key recovery attacks.",
        },
        {
          id: "rat-ssid",
          text: "Hiding the SSID does not provide meaningful security because the network name is still transmitted in probe requests and association frames. Hidden SSIDs cause devices to actively broadcast the network name everywhere they go, which is a worse privacy outcome. Keep the SSID visible for reliable connectivity.",
        },
        {
          id: "rat-admin-pw",
          text: "Default router credentials are publicly documented for every manufacturer. An attacker on the local network or exploiting a CSRF vulnerability could reconfigure the router, redirect DNS, or install malicious firmware.",
        },
        {
          id: "rat-remote-mgmt",
          text: "Remote management exposes the router admin panel to the internet, allowing brute-force attacks or exploitation of firmware vulnerabilities from anywhere in the world. Router administration should only be accessible from the LAN.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. WPA3 eliminates offline dictionary attacks, a visible SSID avoids leaking the network name in probe requests, a strong admin password prevents router takeover, and disabling WAN management closes the external attack surface.",
        partial:
          "Some settings are correct but others remain weak. Review each setting individually: encryption strength, SSID visibility trade-offs, admin credentials, and remote management exposure.",
        wrong:
          "Several critical misconfigurations remain. Default admin passwords and WAN-accessible management interfaces are among the most exploited home router vulnerabilities. Revisit each setting against the corporate remote-work policy.",
      },
    },
    {
      type: "toggle-config",
      id: "wifi-002",
      title: "VPN Split-Tunnel Configuration",
      description:
        "The IT team is configuring the corporate VPN client for remote workers. The current profile uses split tunneling to reduce VPN bandwidth costs, but this may expose corporate traffic. Review and set each tunnel routing option to the correct policy.",
      targetSystem: "Corporate VPN Client — GlobalProtect v6.1",
      items: [
        {
          id: "tunnel-mode",
          label: "Default Tunnel Mode",
          detail:
            "Split tunneling routes only corporate-destined traffic through the VPN, while all other internet traffic goes directly through the home ISP. Full tunnel routes everything through the corporate gateway.",
          currentState: "Split Tunnel",
          correctState: "Full Tunnel",
          states: ["Split Tunnel", "Full Tunnel", "No Tunnel (Disabled)"],
          rationaleId: "rat-full-tunnel",
        },
        {
          id: "dns-routing",
          label: "DNS Query Routing",
          detail:
            "DNS queries can be routed through the VPN tunnel to use corporate DNS servers, or resolved locally through the ISP's DNS. Local DNS resolution is faster but may leak corporate hostnames.",
          currentState: "Local ISP DNS",
          correctState: "Corporate DNS via Tunnel",
          states: [
            "Local ISP DNS",
            "Corporate DNS via Tunnel",
            "Public DNS (8.8.8.8)",
          ],
          rationaleId: "rat-corp-dns",
        },
        {
          id: "kill-switch",
          label: "VPN Kill Switch",
          detail:
            "The kill switch blocks all internet traffic if the VPN connection drops, preventing unprotected data from leaving the device. It is currently disabled to avoid complaints about brief connectivity interruptions.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-kill-switch",
        },
        {
          id: "auto-connect",
          label: "Auto-Connect on Network Change",
          detail:
            "When the device connects to a new Wi-Fi network, the VPN client can automatically establish the tunnel or wait for the user to manually connect.",
          currentState: "Manual Connect",
          correctState: "Auto-Connect",
          states: ["Auto-Connect", "Manual Connect"],
          rationaleId: "rat-auto-connect",
        },
      ],
      rationales: [
        {
          id: "rat-full-tunnel",
          text: "Full tunnel ensures all traffic is inspected by corporate security controls (IDS/IPS, DLP, URL filtering). Split tunneling allows an attacker who compromises the home network to intercept non-corporate traffic and potentially pivot to corporate resources through the open VPN session.",
        },
        {
          id: "rat-corp-dns",
          text: "Local DNS queries expose the names of internal corporate resources to the ISP and any attacker performing DNS monitoring on the home network. Corporate DNS via the tunnel ensures hostname resolution is encrypted and filtered by corporate DNS security policies.",
        },
        {
          id: "rat-kill-switch",
          text: "Without a kill switch, a momentary VPN disconnection causes traffic to flow unencrypted over the home network. This window can expose authentication tokens, API calls, and sensitive data in transit. The brief connectivity interruption is an acceptable trade-off.",
        },
        {
          id: "rat-auto-connect",
          text: "Manual connect creates a window where the user is working on an untrusted network without VPN protection. Auto-connect ensures the tunnel is established immediately when the network changes, especially critical when moving between home Wi-Fi, hotspots, and tethered connections.",
        },
      ],
      feedback: {
        perfect:
          "Perfect configuration. Full tunnel with corporate DNS prevents data leakage, the kill switch eliminates unprotected windows, and auto-connect ensures continuous protection across network changes.",
        partial:
          "Some VPN settings are correct but gaps remain. Each misconfigured option creates a specific data exposure window that an attacker on the home network could exploit.",
        wrong:
          "This VPN configuration leaves significant gaps in remote worker protection. Split tunneling, local DNS, and missing kill switch together create multiple opportunities for traffic interception and data leakage.",
      },
    },
    {
      type: "toggle-config",
      id: "wifi-003",
      title: "Personal Device Network Segmentation",
      description:
        "A remote worker uses a single home router for both corporate and personal devices, including IoT devices (smart TV, security cameras) and family members' devices. Configure the network segmentation to isolate corporate equipment from untrusted consumer devices.",
      targetSystem: "Home Router — VLAN & Guest Network Configuration",
      items: [
        {
          id: "guest-network",
          label: "Guest Network for IoT Devices",
          detail:
            "Smart home devices (TV, thermostat, cameras) are currently on the same network as the corporate laptop. The router supports a guest network with client isolation.",
          currentState: "Same Network as Corporate",
          correctState: "Isolated Guest Network",
          states: [
            "Same Network as Corporate",
            "Isolated Guest Network",
            "Disabled",
          ],
          rationaleId: "rat-iot-isolate",
        },
        {
          id: "inter-vlan",
          label: "Inter-VLAN Routing (Guest to Primary)",
          detail:
            "Traffic routing between the guest network and the primary network allows IoT devices to communicate with the corporate laptop for convenience features like casting and file sharing.",
          currentState: "Allowed",
          correctState: "Blocked",
          states: ["Allowed", "Blocked"],
          rationaleId: "rat-inter-vlan",
        },
        {
          id: "corporate-wifi",
          label: "Corporate Device Wi-Fi Band",
          detail:
            "The corporate laptop can connect to either the 2.4 GHz or 5 GHz band. The 5 GHz band has shorter range but higher throughput and less interference from neighboring networks.",
          currentState: "2.4 GHz Band",
          correctState: "5 GHz Band (Dedicated)",
          states: [
            "2.4 GHz Band",
            "5 GHz Band (Dedicated)",
            "Dual-Band Auto",
          ],
          rationaleId: "rat-5ghz",
        },
        {
          id: "upnp",
          label: "UPnP (Universal Plug and Play)",
          detail:
            "UPnP allows devices to automatically open ports on the router without user intervention. IoT devices and gaming consoles use this feature, but it can be exploited by malware to create inbound firewall rules.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-upnp",
        },
      ],
      rationales: [
        {
          id: "rat-iot-isolate",
          text: "IoT devices are frequent targets due to infrequent patching, default credentials, and minimal security controls. A compromised smart TV or camera on the same network as the corporate laptop can be used as a pivot point for lateral movement.",
        },
        {
          id: "rat-inter-vlan",
          text: "Allowing inter-VLAN routing defeats the purpose of segmentation. If a compromised IoT device can route traffic to the primary network, the segmentation provides no protection. Blocking this traffic ensures true isolation between network zones.",
        },
        {
          id: "rat-5ghz",
          text: "Dedicating the 5 GHz band to corporate devices reduces the attack surface by limiting the physical range of the signal, reduces interference from neighbor networks and 2.4 GHz IoT devices, and provides better throughput for VPN-encrypted traffic.",
        },
        {
          id: "rat-upnp",
          text: "UPnP allows any device on the network to programmatically create port forwarding rules. Malware on an IoT device can use UPnP to expose internal services to the internet or redirect traffic. Disabling UPnP forces explicit port management.",
        },
      ],
      feedback: {
        perfect:
          "Excellent segmentation. Isolating IoT devices, blocking inter-VLAN routing, dedicating the 5 GHz band, and disabling UPnP creates strong boundaries between corporate and personal device zones on the home network.",
        partial:
          "Some segmentation is in place but gaps remain. Incomplete isolation means a compromised IoT device could still reach corporate resources through allowed routes or UPnP-opened ports.",
        wrong:
          "This configuration leaves corporate devices exposed to threats from untrusted IoT and personal devices. Without proper segmentation, a single compromised smart device can serve as a bridge to corporate resources.",
      },
    },
  ],

  hints: [
    "WPA3 addresses specific cryptographic weaknesses in WPA2's handshake mechanism that enable offline brute-force attacks.",
    "Think about what happens to your traffic during the brief moment a VPN disconnects. Does it stop or continue unprotected?",
    "IoT devices are rarely patched and often have known vulnerabilities. Ask yourself: should they share a network with your corporate laptop?",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "As remote work becomes permanent, security teams increasingly evaluate home network configurations during onboarding. Understanding residential network hardening is now a baseline expectation for IT security roles, not just enterprise-grade networking.",
  toolRelevance: [
    "Palo Alto GlobalProtect / Cisco AnyConnect (VPN)",
    "Wireshark (traffic analysis)",
    "Nmap (network scanning for segmentation validation)",
    "Router admin consoles (Netgear, TP-Link, Ubiquiti)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
