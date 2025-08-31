import { getSubscribersFromSheet } from "../gsheet/index.js";
import fs from "fs/promises";
import path from "path";
import { LIMIT_REQUEST_PER_DAY_GEMINI } from "../config/index.js";

const REQUEST_PER_DAY_GEMINI = 100;
const LOG_FILE_PATH = path.join(process.cwd(), "log.json");

export interface DailyStats {
  followers: number;
  likes: number;
  affirmationCount: number; // 全肯定した回数
  uniqueAffirmationUserCount: number; // 全肯定したユニークユーザー数
  conversation: number;
  fortune: number;
  cheer: number;
  analysis: number;
  dj: number;
  anniversary: number;
  topPost: string;
  botComment: string;
  bskyrate: number;
  rpd: number;
  lastInitializedDate?: Date;
}

interface BiorhythmState {
  energy: number;
  mood: string;
  status: string;
}

class Logger {
  private count: number;
  private lastResetDay: number;
  private dailyStats: DailyStats;
  private biorhythmState: BiorhythmState;
  private uniqueAffirmations: string[];

  constructor() {
    this.count = 0;
    this.lastResetDay = new Date().getDate();
    this.dailyStats = {
      followers: 0,
      likes: 0,
      affirmationCount: 0,
      uniqueAffirmationUserCount: 0,
      conversation: 0,
      fortune: 0,
      cheer: 0,
      analysis: 0,
      dj: 0,
      anniversary: 0,
      bskyrate: 0,
      rpd: 0,
      topPost: "",
      botComment: "",
      lastInitializedDate: new Date(),
    };
    this.biorhythmState = {
      energy: 5000, // Initial value from BiorhythmManager
      mood: "",
      status: "Sleep",
    };
    this.uniqueAffirmations = []; // Initialize the private member
    this.loadLogFromFile().then(() => {
      console.log("[INFO] loadLogFromFile completed");
    });
  }

  async loadLogFromFile() {
    try {
      const data = await fs.readFile(LOG_FILE_PATH, "utf-8");
      const parsedData = JSON.parse(data);

      // Initialize with defaults
      const defaultDailyStats: DailyStats = {
        followers: 0,
        likes: 0,
        affirmationCount: 0,
        uniqueAffirmationUserCount: 0,
        conversation: 0,
        fortune: 0,
        cheer: 0,
        analysis: 0,
        dj: 0,
        anniversary: 0,
        bskyrate: 0,
        rpd: 0,
        topPost: "",
        botComment: "",
        lastInitializedDate: new Date(),
      };
      const defaultBiorhythmState = { energy: 5000, mood: "", status: "Sleep" };

      // Load or use defaults for the main objects
      this.dailyStats = { ...defaultDailyStats, ...(parsedData.dailyStats || {}) };
      this.biorhythmState = { ...defaultBiorhythmState, ...(parsedData.biorhythmState || {}) };
      // Load uniqueAffirmations if available, otherwise initialize as empty array
      this.uniqueAffirmations = parsedData.uniqueAffirmations || [];
      this.lastResetDay = parsedData.lastResetDay || new Date().getDate();

      // Handle lastInitializedDate
      if (parsedData.dailyStats?.lastInitializedDate) {
        this.dailyStats.lastInitializedDate = new Date(parsedData.dailyStats.lastInitializedDate);
      }

      console.log("[INFO] Log data loaded successfully.");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("[INFO] Log file not found. Initializing with default values.");
      } else if (error instanceof SyntaxError) {
        console.error("[ERROR] Failed to parse log data: Invalid JSON format.");
      } else {
        console.error("[ERROR] Failed to load log data:", error);
      }
    }
  }

  async saveLogToFile() {
    try {
      const dataToSave = {
        dailyStats: {
          followers: this.dailyStats.followers,
          likes: this.dailyStats.likes,
          affirmationCount: this.dailyStats.affirmationCount,
          uniqueAffirmationUserCount: this.uniqueAffirmations.length, // Use the private member
          conversation: this.dailyStats.conversation,
          fortune: this.dailyStats.fortune,
          cheer: this.dailyStats.cheer,
          analysis: this.dailyStats.analysis,
          dj: this.dailyStats.dj,
          anniversary: this.dailyStats.anniversary,
          topPost: this.dailyStats.topPost,
          botComment: this.dailyStats.botComment,
          bskyrate: this.dailyStats.bskyrate,
          rpd: this.dailyStats.rpd,
          lastInitializedDate: this.dailyStats.lastInitializedDate,
        },
        biorhythmState: this.biorhythmState,
        uniqueAffirmations: this.uniqueAffirmations, // Add this line
      };
      await fs.writeFile(LOG_FILE_PATH, JSON.stringify(dataToSave, null, 2));
      // console.log("[INFO] Log data saved successfully.");
    } catch (error) {
      console.error("[ERROR] Failed to save log data:", error);
    }
  }

  init() {
    this.count = 0;
    this.lastResetDay = new Date().getDate();
    this.dailyStats = {
      followers: 0,
      likes: 0,
      affirmationCount: 0,
      uniqueAffirmationUserCount: 0,
      conversation: 0,
      fortune: 0,
      cheer: 0,
      analysis: 0,
      dj: 0,
      anniversary: 0,
      bskyrate: 0,
      rpd: 0,
      topPost: "",
      botComment: "",
      lastInitializedDate: new Date(),
    };
    this.uniqueAffirmations = []; // Initialize the private member
    this.saveLogToFile();
  }

  addBskyRate() {
    this.dailyStats.bskyrate += 3;
    this.saveLogToFile();
  }

  addRPD() {
    this.dailyStats.rpd++;
    this.saveLogToFile();
  }

  checkRPD() {
    const result = this.dailyStats.rpd < LIMIT_REQUEST_PER_DAY_GEMINI; // Changed from this.rpd
    this.count++;

    if (!result) {
      console.warn(
        `[WARN] RPD exceeded: ${this.dailyStats.rpd} / ${LIMIT_REQUEST_PER_DAY_GEMINI}`
      );
    }

    return result;
  }

  resetIfNeeded() {
    const currentDay = new Date().getDate();
    if (currentDay !== this.lastResetDay) {
      this.init();
    }
  }

  addLike() {
    this.dailyStats.likes++;
    this.saveLogToFile();
  }

  addAffirmation(did: string) {
    this.dailyStats.affirmationCount++; // Increment total count
    if (!this.uniqueAffirmations.includes(did)) {
      this.uniqueAffirmations.push(did);
    }
    this.saveLogToFile();
  }

  addFortune() {
    this.dailyStats.fortune++;
    this.saveLogToFile();
  }

  addCheer() {
    this.dailyStats.cheer++;
    this.saveLogToFile();
  }

  addAnalysis() {
    this.dailyStats.analysis++;
    this.saveLogToFile();
  }

  addDJ() {
    this.dailyStats.dj++;
    this.saveLogToFile();
  }

  addConversation() {
    this.dailyStats.conversation++;
    this.saveLogToFile();
  }

  addFollower() {
    this.dailyStats.followers++;
    this.saveLogToFile();
  }

  addAnniversary() {
    this.dailyStats.anniversary++;
    this.saveLogToFile();
  }

  updateTopPost(uri: string, comment: string) {
    this.dailyStats.topPost = uri;
    this.dailyStats.botComment = comment;
    this.saveLogToFile();
  }

  getDailyStats(): DailyStats {
    return {
      followers: this.dailyStats.followers,
      likes: this.dailyStats.likes,
      affirmationCount: this.dailyStats.affirmationCount,
      uniqueAffirmationUserCount: this.uniqueAffirmations.length, // Use the private member
      conversation: this.dailyStats.conversation,
      fortune: this.dailyStats.fortune,
      cheer: this.dailyStats.cheer,
      analysis: this.dailyStats.analysis,
      dj: this.dailyStats.dj,
      anniversary: this.dailyStats.anniversary,
      topPost: this.dailyStats.topPost,
      botComment: this.dailyStats.botComment,
      bskyrate: this.dailyStats.bskyrate,
      rpd: this.dailyStats.rpd,
      lastInitializedDate: this.dailyStats.lastInitializedDate,
    };
  }

  updateBiorhythmState(energy: number, mood: string, status: string) {
    this.biorhythmState.energy = energy;
    this.biorhythmState.mood = mood;
    this.biorhythmState.status = status;
    this.saveLogToFile();
  }

  getBiorhythmState(): BiorhythmState {
    return this.biorhythmState;
  }
}

export const logger = new Logger();
