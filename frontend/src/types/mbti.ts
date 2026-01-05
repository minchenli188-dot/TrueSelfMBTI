/**
 * MBTI type definitions
 */

export type MBTIType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"  // Analysts
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"  // Diplomats
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"  // Sentinels
  | "ISTP" | "ISFP" | "ESTP" | "ESFP"; // Explorers

export type MBTIGroup = "analyst" | "diplomat" | "sentinel" | "explorer";

export interface MBTIDimension {
  name: string;
  left: string;
  right: string;
  description: string;
}

export const MBTI_DIMENSIONS: MBTIDimension[] = [
  {
    name: "Energy",
    left: "Extraversion (E)",
    right: "Introversion (I)",
    description: "Where you focus your attention and get energy",
  },
  {
    name: "Information",
    left: "Sensing (S)",
    right: "Intuition (N)",
    description: "How you take in information",
  },
  {
    name: "Decisions",
    left: "Thinking (T)",
    right: "Feeling (F)",
    description: "How you make decisions",
  },
  {
    name: "Lifestyle",
    left: "Judging (J)",
    right: "Perceiving (P)",
    description: "How you approach the outside world",
  },
];

export const MBTI_GROUPS: Record<MBTIGroup, {
  name: string;
  description: string;
  types: MBTIType[];
  color: string;
}> = {
  analyst: {
    name: "Analysts",
    description: "Intuitive and Thinking personalities, strategic and rational",
    types: ["INTJ", "INTP", "ENTJ", "ENTP"],
    color: "#88619a",
  },
  diplomat: {
    name: "Diplomats",
    description: "Intuitive and Feeling personalities, empathetic and idealistic",
    types: ["INFJ", "INFP", "ENFJ", "ENFP"],
    color: "#33a474",
  },
  sentinel: {
    name: "Sentinels",
    description: "Observant and Judging personalities, practical and reliable",
    types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
    color: "#4298b4",
  },
  explorer: {
    name: "Explorers",
    description: "Observant and Prospecting personalities, spontaneous and flexible",
    types: ["ISTP", "ISFP", "ESTP", "ESFP"],
    color: "#e2a03f",
  },
};

export const MBTI_TYPE_NAMES: Record<MBTIType, string> = {
  INTJ: "Architect",
  INTP: "Logician",
  ENTJ: "Commander",
  ENTP: "Debater",
  INFJ: "Advocate",
  INFP: "Mediator",
  ENFJ: "Protagonist",
  ENFP: "Campaigner",
  ISTJ: "Logistician",
  ISFJ: "Defender",
  ESTJ: "Executive",
  ESFJ: "Consul",
  ISTP: "Virtuoso",
  ISFP: "Adventurer",
  ESTP: "Entrepreneur",
  ESFP: "Entertainer",
};






