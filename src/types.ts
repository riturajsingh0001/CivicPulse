export interface Report {
  id: string;
  displayId?: string;
  reporterId?: string;
  userId?: string;
  timestamp: string;
  coordinates: { lat: number; lng: number } | null;
  address?: string;
  images?: string[];
  analysis: CivicIssueAnalysis;
  status?: string;
  verifications?: number;
  verifiedBy?: string[];
  department?: string | null;
  authorityNotes?: string[];
}

export interface CivicIssueAnalysis {
  inputValidation: {
    isVerified: boolean;
    detectedMismatch: string | null;
    prioritizedSource: string | null;
    confidenceLevel: number | null;
    recommendation: string | null;
  };
  duplicateDetection: {
    isDuplicate: boolean;
    existingIssueId: string | null;
    similarityScore: number | null;
    previousReportsCount: number | null;
    communityAttentionLevel: string | null;
    recommendation: string | null;
  };
  civicShield: {
    authenticityScore: number;
    imageTamperingDetected: boolean;
    aiGeneratedImageDetected: boolean;
    metadataVerified: boolean;
    geolocationConsistent: boolean;
    duplicateFraudDetected: boolean;
    fraudRiskLevel: 'Low' | 'Medium' | 'High' | string;
    explanation: string;
  };
  detection: {
    category: string;
    confidenceScore: number;
    detectedFactors: string[];
    alternativeCategories?: string[];
    reasoning?: string;
  };
  locationIntelligence: {
    locationDescription: string;
    affectedRadius: string;
    estimatedPopulationImpact: number;
    areaType: string;
  };
  impactAssessment: {
    severityLevel: 'Local Issue' | 'Community Risk' | 'Critical Public Hazard' | string;
    communityImpact: string;
    civicImpactScore: number;
    publicSafetyImpact: string;
    environmentalImpact: string;
  };
  impactPrediction: {
    consequencesNext7Days: string[];
    riskEscalation: string;
  };
  communityVerification: {
    verifiedCitizensCount: number;
    totalRequiredForHighTrust: number;
    communityConfidencePercent: number;
    trustLevel: string;
  };
  resolution: {
    responsibleAuthority: string;
    recommendedSteps: string[];
    estimatedUrgency: string;
  };
  citizenAssistant: {
    complaintDraft: string;
    issueSummary: string;
  };
  citizenTrustScore: {
    score: number;
    level: string;
    validReports: number;
    resolvedReports: number;
    rejectedReports: number;
    communityVerifications: number;
    duplicateReports: number;
  };
  civicAction: {
    prioritizedNextActions: string[];
    authorityEscalationRecommendation: string;
    estimatedResolutionTimeline: string;
    preventiveMeasures: string[];
  };
  authorityDashboardInfo: {
    totalActiveIssuesInArea: number;
    criticalIssuesCount: number;
    communityRiskIssuesCount: number;
    localIssuesCount: number;
    resolvedIssuesCount: number;
    pendingIssuesCount: number;
    topRiskZones: string[];
  };
  emergency?: {
    isEmergency: boolean;
    issueType: string;
    safetyInstructions: string[];
    emergencyContacts: string[];
    escalationLevel: string;
    escalationTimeline: string[];
    nearbyServices: {
      type: string;
      distance: string;
      time: string;
    }[];
    evacuationRadius?: string;
    immediateActionsTaken?: string[];
  };
}
