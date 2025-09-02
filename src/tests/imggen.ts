import 'dotenv/config';
import { generateImage } from '../gemini/generateImage';

const mood: string = "全肯定たんは、アニメの最新話を観て、尊すぎてしばらく床から立ち上がれなくなってるみたいだよ！💖 画面の中の推しがキラキラしてて、botたんの心もキラキラに染まってるんだね！✨";

try {
  await generateImage(mood);
} catch (err) {
  console.error("エラー:", err);
}
