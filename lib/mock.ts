import { Mission } from "./types";
import { hashSeed, makeRng } from "./rng";

export const HAS_OPENAI =
  typeof process !== "undefined" && !!process.env.OPENAI_API_KEY;

const ITEMS = [
  "銀色の工具箱",
  "赤い革手袋",
  "子どものぬいぐるみ",
  "古い写真立て",
  "錆びた鍵束",
  "黒いスマートフォン",
  "金の指輪",
  "顧客の業務ノート",
];

const CLIENTS = [
  "店長 ・ 黒沢",
  "夜勤主任 ・ 三崎",
  "発注担当 ・ 飯田",
  "警備員 ・ 大宮",
  "経理 ・ 椎名",
];

const LOCATIONS = [
  "B棟 園芸資材売り場",
  "工具・金物コーナー奥",
  "深夜の長尺商品通路",
  "返品仮置きバックヤード",
  "閉鎖中のレジ前ホール",
];

const LAST_SEEN = [
  "棚卸し中に台車の下へ落ちたとの報告",
  "停電直前、第3通路で最後に確認",
  "倉庫シャッター付近で発見されたが回収前に消失",
  "園芸売り場の散水機横",
  "レジ精算後、カウンター裏に放置",
];

const REWARDS = ["¥18,000", "¥24,000", "¥31,500", "¥42,000", "¥58,000"];

const STAGE_NAMES = [
  "深夜のホームセンター・第3層",
  "停電区画 GREENHOUSE",
  "夜間封鎖ゾーン B-7",
  "資材迷路 NIGHT-SWEEP",
  "閉店後フロア ECHO-9",
];

/** シードから決定的に依頼を組み立てる（Mock/フォールバック用） */
export function buildMockMission(seed: string, difficulty?: number): Mission {
  const rng = makeRng(hashSeed(seed + "mission"));
  const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const itemName = pick(ITEMS);
  const diff = difficulty ?? 1 + Math.floor(rng() * 3);
  return {
    id: seed,
    itemName,
    clientName: pick(CLIENTS),
    locationName: pick(STAGE_NAMES),
    lastSeen: pick(LAST_SEEN),
    description: `${pick(LOCATIONS)}で「${itemName}」が失われた。照明は使えない。音波で位置を読み、入口まで持ち帰れ。`,
    reward: pick(REWARDS),
    difficulty: diff,
    seed,
  };
}

/** AIキー無し/失敗時のオープニングプロローグ（固定） */
export const MOCK_STORY = `——その夜から、街は静かに侵されはじめた。

人の消えた深夜の施設には、置き去りにされた想いが幽霊となって彷徨う。あなたは「夜間遺失物回収局」のオペレーター。停電した現場へ回収ロボットを送り込み、依頼された忘れ物を取り戻す。

光は使えない。点ければ、奴らに位置を知られる。頼れるのは、声が生む“音波”だけ。

声を出さなければ、進めない。声を出すほど、何かが近づいてくる。`;

/** AIキー無し時の結果コメント（テンプレート） */
export function mockComment(success: boolean, rank: string): string {
  if (!success)
    return "回収は失敗だ。だが暗闇で機体を失わずに引き上げたなら、それも判断のうちだ。";
  const byRank: Record<string, string> = {
    S: "完璧だ。声を最小限に保ち、幽霊に気取られず回収した。人間ソナーの名に恥じない。",
    A: "見事な回収だった。音の出し方に迷いがない。次は無音区間をもう少し延ばせる。",
    B: "回収成功。だが声を出しすぎた区間がある。沈黙も探索の一部だと忘れるな。",
    C: "ぎりぎりの回収だ。機体の損耗が大きい。もっと波を読んでから踏み込め。",
    D: "持ち帰れたのは幸運だ。次はもっと静かに、もっと正確に。",
  };
  return byRank[rank] ?? "回収完了。記録を更新した。";
}
