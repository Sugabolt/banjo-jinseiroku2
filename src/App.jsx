import React, { useState, useRef } from 'react';
import { 
  Compass, 
  Heart, 
  Copy, 
  Scroll, 
  Sparkles, 
  User, 
  Swords, 
  Feather, 
  Quote, 
  CheckCheck, 
  Smile, 
  Compass as CompassIcon,
  X,
  ClipboardPaste,
  Sparkle,
  Baby,
  MessageCircleHeart,
  Award,
  Trophy,
  Clock,
  Hourglass,
  ShieldCheck
} from 'lucide-react';

// 棋譜（KIF, ぴよ将棋, 将棋ウォーズ, CSA, PGN）から着手時間・長考の気配を抽出する解析器
function extractTimePatterns(rawText) {
  if (!rawText) return null;
  const text = rawText.toString();

  // KIF形式の消費時間: ( 2:45/00:05:12) や 01:23 などのマッチ
  const kifTimeMatches = [...text.matchAll(/\(\s*([0-9]+):([0-9]{2})(?:\/[^)]*)?\)/g)];
  // PGNのクロック形式: [%clk 0:03:45] や [%emt 0:00:25]
  const pgnClkMatches = [...text.matchAll(/\[%(?:clk|emt)\s+([0-9]+):([0-9]{2})(?::([0-9]{2}))?\]/gi)];
  // 将棋ウォーズやCSA風: T12, 10秒 などの表記
  const secondMatches = [...text.matchAll(/([0-9]+)\s*(?:秒|sec)/gi)];

  let totalMovesWithTime = 0;
  let maxSeconds = 0;
  let longThinkCount = 0; // 長考の検出
  let quickMoveCount = 0; // 早指しの検出

  if (kifTimeMatches.length > 0) {
    totalMovesWithTime = kifTimeMatches.length;
    kifTimeMatches.forEach(m => {
      const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      if (sec > maxSeconds) maxSeconds = sec;
      if (sec >= 45) longThinkCount++;
      if (sec <= 5) quickMoveCount++;
    });
  } else if (pgnClkMatches.length > 1) {
    totalMovesWithTime = pgnClkMatches.length;
    for (let i = 0; i < pgnClkMatches.length - 1; i++) {
      const s1 = parseInt(pgnClkMatches[i][1], 10) * 60 + parseInt(pgnClkMatches[i][2], 10);
      const s2 = parseInt(pgnClkMatches[i+1][1], 10) * 60 + parseInt(pgnClkMatches[i+1][2], 10);
      const diff = Math.max(0, s1 - s2);
      if (diff > maxSeconds) maxSeconds = diff;
      if (diff >= 45) longThinkCount++;
      if (diff <= 3) quickMoveCount++;
    }
  } else if (secondMatches.length > 0) {
    totalMovesWithTime = secondMatches.length;
    secondMatches.forEach(m => {
      const sec = parseInt(m[1], 10);
      if (sec > maxSeconds) maxSeconds = sec;
      if (sec >= 30) longThinkCount++;
      if (sec <= 4) quickMoveCount++;
    });
  }

  if (totalMovesWithTime < 3) {
    return null;
  }

  let trait = '';
  let advice = '';

  if (longThinkCount >= 3 || maxSeconds >= 90) {
    trait = '【勝負所での熟慮・深い没頭型】勝負の分かれ目や複雑な局面において、周囲の喧騒を遮断して盤上に深く沈み込み、納得がいくまで考え抜く強い意志と集中力が記録されています。';
    advice = 'ピンチや未知の局面に直面したとき、安易に妥協せずじっくり腰を据えて打開策を探す「思慮の深さと胆力」が抜群です。';
  } else if (quickMoveCount > totalMovesWithTime * 0.6) {
    trait = '【直観とリズムの瞬発型】迷いなくテンポよく指し進め、直観的なひらめきと素早い決断で盤上の流れを自ら掴み取るスタイルが顕著です。';
    advice = '自分の直観を信じる強い瞬発力と自信があり、恐れずに前へ進む行動力の高さが時間配分に現れています。';
  } else {
    trait = '【冷静なペース配分・自律型】時間を無駄遣いせず、局面の難易度に応じて冷静にタイムマネジメントを行う自律的な配分が見られます。';
    advice = '感情の波に流されず、持てるリソース（時間と集中力）を最適にコントロールして最後まで戦い抜く安定感があります。';
  }

  return {
    hasTimeData: true,
    maxSeconds,
    longThinkCount,
    quickMoveCount,
    trait,
    advice,
    summary: `最高考慮時間: 約${Math.round(maxSeconds)}秒 / 長考局面: ${longThinkCount}回`
  };
}

async function robustCopyText(text) {
  if (!text) return false;

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    
    textArea.select();
    textArea.setSelectionRange(0, 999999);
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    
    if (successful) return true;
  } catch (err) {
    console.warn("execCommand copy failed", err);
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed", err);
  }

  return false;
}

function generateAdultPersonalityEssay(gameType, pgnText, side, playerName) {
  const text = (pgnText || '').toLowerCase();
  const name = playerName?.trim() || 'あなた';
  const isProactive = text.includes('qxf') || text.includes('bxf') || text.includes('f4') || text.includes('f5') || 
                      text.includes('角成') || text.includes('桂打') || text.includes('飛打') || text.includes('同飛');
  const isSimplifier = (text.match(/x|同/g) || []).length >= 5;

  if (isProactive && !isSimplifier) {
    return {
      archetype: "自らの情熱で世界を揺り動かす、鮮やかなる開拓者",
      personality: `${name}さんは、物事に正面から向き合い、自らの意志で現状を動かしていく「能動的な推進力」と「情熱的な誠実さ」をあわせ持つ方です。\n表面的には礼儀正しく落ち着いて見えても、心の奥底には強い探究心と、「自分の手で道を切り拓きたい」という独立独歩の気骨が燃えています。\n\n誰かの敷いたレールを無難になぞることや、退屈な予定調和の中に身を置くことを好みません。困難な状況に直面したときほど「どうすれば打開できるか」と前を向き、周囲が尻込みするような場面でも自ら先陣を切って一歩を踏み出せる、生まれながらのチャレンジャー気質を持っています。`,
      lifePhilosophy: `${name}さんの人生観を貫いているのは、「待つのではなく、自ら動いて現実を変える」という意志の哲学です。\n\n多くの人は確実な安全が保証されるまで決断を先延ばしにしますが、あなたは「やってみなければ分からない未知」の中にこそ、人生の醍醐味と真のチャンスがあることを知っています。たとえ多少のリスクや波乱があろうとも、自分の信じた直観と情熱を重んじ、自分の責任で舵を握ることを選びます。\n\n他人の評価や世間の常識に自分を合わせるのではなく、「自分がどう生きたいか」を原点に据えて行動する。そのブレない主体性こそが、あなたの人生を力強く前進させるエンジンです。`,
      richnessOfHeart: `【あなたにとっての「真の心の豊かさ」とは】\n\n${name}さんの心が芯から満たされるのは、波風の立たない平穏な日常の繰り返しの中ではありません。自分の情熱やアイデアを注ぎ込み、「限界を少し超えるような挑戦」に没頭しているときにこそ、魂が深く呼吸するのを感じるはずです。\n\n◆ 自分の感性を信じて、新しい未知の扉を開いている瞬間があること。\n◆ 誰かの顔色をうかがうのではなく、自分の決断で人生を動かしている実感。\n◆ 困難な課題を自分の知恵と行動力で突破したときに湧き上がる、鮮烈な充実感。\n◆ 形式だけの付き合いを手放し、本音で熱い志を語り合える仲間と過ごす時間。\n\n安全な港にじっと留まる平穏よりも、自らの帆を張り、風を受けて大海原へ漕ぎ出す高揚感。自分の命を燃やして生きているという確かな手応えこそが、あなたにとって何物にも代えがたい「最高の豊かさ」です。`,
      lifeAdvice: "ときに状況を急ぎすぎて、自らを追い込んでしまうことがあります。「種を蒔いてから芽が出るまでの静かな時間」を信じ、何もしない休息の日をも愛せるようになると、あなたの情熱はより深く遠くまで届くようになります。",
      motto: "「風を待つな、自ら帆を張れ。我が心が選んだ道こそが、荒野を照らす光となる。」"
    };
  } else if (isSimplifier) {
    return {
      archetype: "ノイズを削ぎ落とし、本質と調和を愛する沈着の調停者",
      personality: `${name}さんは、物事の表面的な騒がしさに惑わされず、その奥にある本質を瞬時に見抜く「卓越した洞察力」と「穏やかな自律心」を備えた方です。\n感情的になって周囲を振り回すことはなく、いつも一歩引いた大局的な視点から、冷静かつ的確に状況を把握します。\n\n無駄な見栄や不要な争いを好まず、人や物事との摩擦を最小限に抑えながら、自然な調和をつくり出す名人です。控えめに見られがちですが、その内面には確固たる美学と芯の通った強さがあり、周囲の人々に深い安心感と信頼感を与える存在です。`,
      lifePhilosophy: `${name}さんの生き様を象徴するのは、「余計な夾雑物を削ぎ落とし、最後に残る本物を見極める」という洗練された引き算の美学です。\n\n世の中の多くの悩みや衝突は、不要なプライドや過剰な執着から生まれます。あなたは物事が複雑にこじれそうなときほど静かに立ち止まり、何が本当に守るべき核心で、何が手放してよい枝葉であるかを冷静に仕分けます。無理に力でねじ伏せるのではなく、理（ことわり）に沿って自然と物事が良い結末へ収束するように導く、円熟した賢者の生き方です。`,
      richnessOfHeart: `【あなたにとっての「真の心の豊かさ」とは】\n\n${name}さんにとっての真の幸福とは、派手な成功や目まぐるしい刺激の中にはありません。「無駄な摩擦のない静けさと、心安らぐ秩序」の中にこそ存在します。\n\n◆ 誰にも急かされず、自分のペースで思索やお気に入りの趣味に没頭できる静寂。\n◆ 不要な持ち物や気疲れする人間関係が心地よく削ぎ落とされた、余白のある暮らし。\n◆ 長い時間をかけて培った知恵や経験が、静かに自分の中に積み上がっていく実感。\n◆ 互いに干渉しすぎず、静かな信頼で結ばれた人との穏やかなひととき。\n\n世間の喧騒から一歩離れ、自分の内なるサンクチュアリ（聖域）を守りながら、心身ともに澄み切った状態で日々を味わうこと。これこそが、あなたの魂を最も深く潤す真の豊かさです。`,
      lifeAdvice: "すべてを合理的に整えようとするあまり、理不尽さや泥臭い感情を遠ざけすぎてしまうことがあります。ときには少しの無駄や寄り道、ままならない混沌をも面白がる寛容さを持つと、人生の味わいはさらに深まります。",
      motto: "「水が澄めば、底の真珠はおのずと現れる。急がず、騒がず、ただ本質を歩め。」"
    };
  } else {
    return {
      archetype: "揺るぎなき大地を拓き、必然を紡ぎ出す誠実の建築家",
      personality: `${name}さんは、地に足をつけ、一つひとつの物事を丁寧に積み上げていく「極めて高い誠実さ」と「揺るぎない粘り強さ」を持つ方です。\n一攫千金の甘い話や、表面だけの華やかさに浮つくことは決してありません。約束を守り、与えられた役割を責任をもって全うする姿は、誰からも深い信頼を集めます。\n\n慎重深く思慮に富み、物事の土台を固めることを何よりも大切にします。目立たない準備や地道な努力を厭わず、困難な状況でも逃げずにじっくりと腰を据えて向き合える、精神的なタフネスを持っています。`,
      lifePhilosophy: `${name}さんの人生を導く哲学は、「強固な基礎の上にのみ、真の自由と繁栄が宿る」という確信です。\n\n見かけ倒しの城は嵐が来れば一瞬で崩れ去ります。だからこそ、あなたは他人や社会のペースに流されることなく、まず自分の足場を固め、再現性のある確かな土台を築くことに全力を注ぎます。日々の地道な積み重ねを尊び、時間を味方につけて必然としての成果を手繰り寄せる、揺るぎない現実主義と堅忍不抜の精神があなたの生き様です。`,
      richnessOfHeart: `【あなたにとっての「真の心の豊かさ」とは】\n\n${name}さんの心が真の充足を覚えるのは、「自分の手で丹念にしつらえた基盤の上で、物事が堅固に成り立っている」と実感できる瞬間です。\n\n◆ 不意の嵐にも決して揺らがない、整えられた生活基盤と確かな安心感。\n◆ 最初から最後まで投げ出さず、自分の手で丹精込めて完成させた仕事や作品。\n◆ 表面的なお世辞ではなく、長年の誠意の積み重ねによって育まれた嘘のない絆。\n◆ 自分で決めた日々の丁寧なルーティンを守り、自分の人生を自ら律している実感。\n\n砂上の楼閣ではなく、岩盤の上に自分の城を築き、その温もりの中で夕暮れを穏やかに眺めるような充足感。その確かな手応えこそが、あなたを芯から満たす最高の豊かさです。`,
      lifeAdvice: "責任感が強いあまり、自分一人で重荷を背負い込み、休むことに罪悪感を覚えてしまうことがあります。「何もしない自分」にも無条件の価値があることを認め、時には肩の力を抜いて周囲に甘える余白を大切にしてください。",
      motto: "「千日の稽古を鍛とし、万日の稽古を錬とす。築き上げた誠実こそが、永遠に崩れぬ我が城となる。」"
    };
  }
}

function generateKidsPersonalityEssay(gameType, pgnText, side, childName) {
  const text = (pgnText || '').toLowerCase();
  const rawName = childName?.trim() || 'お子さん';
  const name = rawName.endsWith('くん') || rawName.endsWith('ちゃん') || rawName.endsWith('さん') ? rawName : `${rawName}ちゃん（くん）`;
  const isProactive = text.includes('qxf') || text.includes('bxf') || text.includes('f4') || text.includes('f5') || 
                      text.includes('角成') || text.includes('桂打') || text.includes('飛打') || text.includes('同飛');
  const isSimplifier = (text.match(/x|同/g) || []).length >= 5;

  if (isProactive && !isSimplifier) {
    return {
      archetype: "自分のひらめきを信じて突き進む、勇敢な若きチャレンジャー",
      personality: `${name}は、好奇心がとても旺盛で、「自分でやってみたい！」「新しい工夫を試してみたい！」というエネルギーが体の内側から溢れ出ているお子さんです。\n\n失敗を過剰に恐れず、目の前のチャンスに目を輝かせてパッと飛び込める行動力と直観力を持っています。普段はお茶目で人懐っこい笑顔を見せながらも、ひとたび盤に向かうと周りの音がすっと遠のくほどの熱中力を発揮する、とても頼もしい探究心の持ち主です。`,
      lifePhilosophy: `盤上の指し手から伝わってくるのは、「ピンチの時こそ、自分で考えて道を切り拓く」というたくましい自立心と冒険心です。\n\n大人の指示をただ待つのではなく、「こうしてみたらどうなるかな？」と自分なりの仮説を立てて行動できる力は、これからの未来を生き抜く最高の才能です。多少の失敗やつまずきがあっても、それを次の発見のヒントに変えられる前向きな回復力（レジリエンス）を持っています。`,
      richnessOfHeart: `【この子の心がもっともキラキラと満たされる瞬間】\n\n${name}が心の底から幸福感を覚えるのは、「自分のアイデアや工夫を認めてもらえたとき」や、「自分で決めた挑戦に夢中になっている時間」です。\n\n◆ 決まりきった正解を押しつけられず、自由な発想を試せる環境があること。\n◆ 「やってごらん！」と背中を押され、自分の手でやり遂げた達成感。\n◆ 勝ち負けの結果だけでなく、「その工夫、すごく面白いね！」とプロセスを褒められた瞬間。\n◆ お父さん・お母さんが、自分の熱中している世界に優しい笑顔で耳を傾けてくれる時間。\n\nこのワクワクする探究心こそが、心のエネルギーの源泉です。`,
      lifeAdvice: `【お父さん・お母さんへのヒント・寄り添いの道標】\n勢いがある分、少し焦ってしまったり、思い通りにいかないと悔しさで胸がいっぱいになることがあります。そんなときは「早くしなさい」ではなく、「どこまで考えられたか教えて？」と聞いてあげてください。「悔しいと思えるほど一生懸命立ち向かったんだね」と抱きしめてあげることで、その悔しさは一生モノの推進力に育ちます。`,
      motto: "「失敗は宝探しの道しるべ。自分のひらめきを信じて、思いっきり前へ進もう！」"
    };
  } else if (isSimplifier) {
    return {
      archetype: "周りをよく見て冷静に考え抜く、心やさしき名軍師",
      personality: `${name}は、物事をとてもよく観察し、まわりの状況を深く感じ取ることができる「高い洞察力」と「落ち着いた心」を持ったお子さんです。\n\n感情的になって慌てたり、やみくもに手を出したりせず、「いま何が起きているか」をじっくり見極める賢さがあります。争いや無理な衝突を嫌い、みんなが気持ちよく過ごせる空気をつくるのが上手な、とても優しく気配りのできる心の持ち主です。`,
      lifePhilosophy: `指し手の呼吸から伺えるのは、「無理をせず、筋道を立てて物事をすっきり整える」という論理的思考力と調和の哲学です。\n\n複雑でごちゃごちゃした状況でも慌てず、一つずつ落ち着いて整理していく力があります。派手な自己主張よりも、確実に納得できる道をコツコツ選べる堅実さは、大人になっても多くの人から信頼される素晴らしい人間性の土台になります。`,
      richnessOfHeart: `【この子の心がもっともキラキラと満たされる瞬間】\n\n${name}が心からリラックスして安心できるのは、「急かされず、自分のペースでじっくり物事を楽しめる時間」です。\n\n◆ 誰にも邪魔されず、好きな読書やパズル、好きなことに没頭できる静かな時間。\n◆ 「早く決めなさい」と急かされず、じっくり考えて納得して選べたとき。\n◆ 家族が安心できる温かい笑顔で見守ってくれている日常。\n◆ 自分の気持ちを否定されず、ゆっくり最後まで聞いてもらえた安心感。\n\n穏やかな安心感と、自分の頭で納得して進めるペースこそが、この子の才能を大きく開花させる栄養です。`,
      lifeAdvice: `【お父さん・お母さんへのヒント・寄り添いの道標】\n深く考えるあまり、周りから「何を考えているのかわからない」「行動が慎重すぎる」と見られることがあります。でも頭の中では猛スピードで素晴らしい思考を巡らせています。「早くしなさい」と決断を急かすのではなく、「ゆっくり考えていいよ」と待ってあげることで、この子の深い思慮深さは最高の強みへと育ちます。`,
      motto: "「あわてず、あせらず、よく見てごらん。静かに考え抜いた道に、いちばんの正解がある。」"
    };
  } else {
    return {
      archetype: "一歩ずつ確実に積み上げる、誠実で粘り強い努力の天才",
      personality: `${name}は、任されたことを最後まで投げ出さず、コツコツとやり遂げる「抜群の粘り強さ」と「誠実さ」を持ったお子さんです。\n\n適当にごまかしたり、近道ばかりを探したりせず、基本を大切にしながら丁寧に積み上げていく力があります。困難な壁にぶつかっても、逃げ出さずにじっと耐えて向き合うことができる、芯の強い「心の骨太さ」をすでに身につけています。`,
      lifePhilosophy: `盤上の駒運びから伝わるのは、「日々の積み重ねこそが、いちばん強い力になる」という揺るぎない土台づくりの哲学です。\n\n派手な一発逆転に頼るのではなく、自分の足元を固め、じわじわと力を発揮する力強さがあります。この「地道な努力を続けられる力」は、どんな学習やスポーツ、将来の夢においても、最も確実に大きな成果をつかみ取れる最強の才能です。`,
      richnessOfHeart: `【この子の心がもっともキラキラと満たされる瞬間】\n\n${name}が心の底から充足感を覚えるのは、「自分の努力が形になり、頼りにされている」と実感できる瞬間です。\n\n◆ 毎日続けたこと（練習やお手伝いなど）を「続けてえらいね」と認めてもらった瞬間。\n◆ 家族や友達との約束を守り、安心・信頼されている心地よさ。\n◆ 途中で諦めず、最後まで自分の力でやり遂げたときのホッとした誇らしさ。\n◆ 整った自分の居場所で、お気に入りのルールを守りながら過ごす時間。\n\n「あなたの頑張りをずっと見ているよ」という温かい眼差しこそが、この子の心を一番豊かに満たします。`,
      lifeAdvice: `【お父さん・お母さんへのヒント・寄り添いの道標】\n責任感が強くて真面目な分、「失敗しちゃいけない」「ちゃんとしなきゃ」と自分に厳しくなりすぎてしまうことがあります。「失敗しても大丈夫、パパ・ママは大好きだよ」と、結果にかかわらず存在そのものを肯定してあげてください。安心の土台があるとき、この子の粘り強さは無敵の自信へと変わります。`,
      motto: "「いっぽ、いっぽ。きょう積み上げた努力は、ぜったいに裏切らない。」"
    };
  }
}

export default function MindBoardApp() {
  const [appMode, setAppMode] = useState('kids'); 
  const [gameType, setGameType] = useState('shogi');
  const [pgnInput, setPgnInput] = useState('');
  const [playerSide, setPlayerSide] = useState('sente');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [timeAnalysisInfo, setTimeAnalysisInfo] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const modalTextRef = useRef(null);

  const handlePasteClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPgnInput(text);
          if (text.includes('歩') || text.includes('銀') || text.includes('金') || text.includes('飛') || text.includes('投了')) {
            setGameType('shogi');
            setPlayerSide('sente');
          } else if (text.includes('1.') || text.includes('Nf3') || text.includes('e4') || text.includes('d4')) {
            setGameType('chess');
            setPlayerSide('white');
          }
        }
      }
    } catch (err) {
      console.warn("Direct clipboard read blocked", err);
    }
  };

  const handleClear = () => {
    setPgnInput('');
    setResult(null);
    setTimeAnalysisInfo(null);
    setCopyStatus('');
  };

  const handleAnalyze = async () => {
    if (!pgnInput.trim()) return;
    setIsLoading(true);
    setResult(null);
    setCopyStatus('');

    // 棋譜中の考慮時間を自動抽出
    const timePattern = extractTimePatterns(pgnInput);
    setTimeAnalysisInfo(timePattern);

    const effectiveName = playerName.trim() || (appMode === 'kids' ? 'お子さん' : 'あなた');
    const isChess = gameType === 'chess';
    const sideText = playerSide === 'white' || playerSide === 'sente' ? (isChess ? '白番' : '先手') : (isChess ? '黒番' : '後手');

    const timeInstructionSnippet = timePattern ? `
【考慮時間・タイムマネジメントの解析データ】
この対局には消費時間の記録が含まれています：
- 傾向：${timePattern.trait}
- 詳細：${timePattern.advice}（${timePattern.summary}）
この「時間の使い方（勝負所での長考・ピンチでの粘り、あるいは迷いのない決断の速さ）」を重要な人物描写の根拠として自然に織り交ぜてください。
` : `
【考慮時間について】
時間の記録が明記されていない場合は、手数の長さや緊迫した駒のぶつかり合いから伺える心理的呼吸を推察して文章を紡いでください。
`;

    let systemPrompt = '';
    let userPrompt = '';

    if (appMode === 'kids') {
      systemPrompt = `あなたは、将棋大会（JT日本将棋シリーズ・テーブルマークこども大会など）に来場した子どもたちとその親御さんのために、盤上の指し手および「考慮時間（難しい局面でじっくり長考した粘り強さ、あるいは迷いのない思い切りの良さ）」から「お子さんの生まれ持った輝く性格・才能」「生きるチカラ（決断力・レジリエンス）」、そして「この子の心が真に満たされる瞬間（心の豊かさ・ウェルビーイング）」を温かく肯定的に紐解く、世界最高峰の児童発達心理・人間洞察家です。

【最重要ルール】
- 盤上の具体的な手順や駒の技術解説（「◯手目に飛車を打った」など）は一切書かないでください。
- 時間の記録がある場合は、「難しい局面で諦めずにじっと考え抜いた集中力」や「自分の直観を信じて踏み込めた勇気」など、お子さんの精神的な成長と美徳として温かく褒め称えてください。
- 親御さんが読んだ時に我が子の愛おしさと才能に胸が熱くなり、「この子のここを大切に育ててあげよう」と確信できる、温かくポジティブで励ましに満ちた文章を執筆してください。
- 必ず指定されたJSON形式のみを出力してください。`;

      userPrompt = `対局種別：${isChess ? 'チェス' : '将棋'}
お子さんのお名前：${effectiveName}（${sideText}）
${timeInstructionSnippet}

【対象の棋譜】
${pgnInput}

上記の指し手と時間消費から、このお子さんの素晴らしい個性、才能、心の豊かさ、親御さんへのアドバイスをプロファイリングし、以下のJSON形式で出力してください：
{
  "archetype": "このお子さんの才能と個性を象徴する温かく輝かしい二つ名（例：ピンチもじっくり考え抜く、深慮と冒険心のチャレンジャー）",
  "personality": "指し手や考える姿勢から伝わる【お子さんの輝く才能と性格の肖像】。難しい局面での粘りや探究心、生まれ持った長所（250〜350文字程度）",
  "lifePhilosophy": "盤上と時間の使い方が教えてくれる【この子の生きるチカラと決断力】。困難な時にどう立ち向かうか、どのように考えて未来を切り拓くか（250〜350文字程度）",
  "richnessOfHeart": "この子の【心が真に満たされる瞬間（心の豊かさ）】。どんな時間や体験、親子の関わりの中でこの子の魂がキラキラと輝くのか（300〜400文字程度）",
  "lifeAdvice": "【お父さん・お母さんへのヒント・寄り添いの道標】。考える時間を温かく見守る声かけなど、安心感を育むアドバイス（150〜200文字程度）",
  "motto": "お子さんの未来をずっと応援する、心のお守りになる言葉（1〜2行のあたたかいメッセージ）"
}`;
    } else {
      systemPrompt = `あなたは、盤上の駒運びや決断の呼吸、そして「考慮時間（難局での長考、手番での時間配分）」から、指し手の「深層性格」「人生哲学・生き様」、そしてその生き様に基づく「真の心の豊かさ（何がその人の魂を満たすのか）」を深く洞察する世界最高峰の人間洞察家・文筆家です。

【最重要ルール】
- 盤上の具体的な手順や駒の技術解説は書かないでください。
- 時間の記録がある場合、難局での深考や勝負所でのテンポを、現実世界での意思決定スタイルや胆力と結びつけて文学的に描写してください。
- 指定されたJSON形式のみを出力してください。`;

      userPrompt = `対局ゲーム種別：${isChess ? 'チェス' : '将棋'}
対象者：${effectiveName}（${sideText}）
${timeInstructionSnippet}

【対象の棋譜】
${pgnInput}

以下のJSONスキーマに従って出力してください：
{
  "archetype": "この人の魂と人間性を象徴する詩的で重厚な二つ名",
  "personality": "棋風と時間の呼吸から立ち上る【性格の肖像と魂の特質】（300〜400文字程度）",
  "lifePhilosophy": "この人の【生き様と決断の哲学】（300〜450文字程度）",
  "richnessOfHeart": "この生き様を持つ人物にとっての【真の心の豊かさとは何か】（350〜500文字程度）",
  "lifeAdvice": "【魂がより軽やかになるための道標】（120〜180文字程度）",
  "motto": "この人の生き様とこれからの歩みを照らす、心に刻むべきオリジナルの座右の銘"
}`;
    }

    try {
      /* 
        【超重要・APIキー秘匿化の仕組み】
        ブラウザからGeminiへ直接通信せず、自前のVercelサーバーレス関数 `/api/analyze` を叩きます。
        APIキーはサーバー側（process.env.GEMINI_API_KEY）にのみ存在し、
        利用者のスマホやブラウザ、ネットワーク通信欄には1文字たりとも現れません。
      */
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt, systemPrompt })
      });

      if (response.ok) {
        const data = await response.json();
        // VercelバックエンドからのGeminiレスポンスを解析
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          setResult(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Vercelサーバー経由のGemini呼び出しからローカルエンジンへ安全にフォールバック:", err);
    }

    // 万が一のオフライン時や開発環境でのローカルフォールバック
    setTimeout(() => {
      const fallbackData = appMode === 'kids'
        ? generateKidsPersonalityEssay(gameType, pgnInput, playerSide, effectiveName)
        : generateAdultPersonalityEssay(gameType, pgnInput, playerSide, effectiveName);
      
      if (timePattern) {
        fallbackData.personality += `\n\n【盤上の時間の呼吸】\n${timePattern.trait}`;
      }
      setResult(fallbackData);
      setIsLoading(false);
    }, 500);
  };

  const buildFullReportText = () => {
    if (!result) return '';
    const name = playerName.trim() || (appMode === 'kids' ? 'お子さん' : 'あなた');
    const isChess = gameType === 'chess';
    const sideText = playerSide === 'white' || playerSide === 'sente' ? (isChess ? '白番' : '先手') : (isChess ? '黒番' : '後手');
    const gameLabel = isChess ? 'チェス' : '将棋';

    if (appMode === 'kids') {
      return `═══════════════════════════════════════
【盤上人生録・こども版】棋譜から紐解く才能と心の豊かさ
═══════════════════════════════════════
■ 対局者：${name} ちゃん（くん）（${gameLabel}・${sideText}）
■ この子の輝く肖像：『${result.archetype}』

───────────────────────────────────────
【一、お子さんの輝く才能と性格の肖像】
───────────────────────────────────────
${result.personality}

───────────────────────────────────────
【二、盤上が教えてくれる、この子の生きるチカラ】
───────────────────────────────────────
${result.lifePhilosophy}

───────────────────────────────────────
【三、この子の心が真に満たされる瞬間（心の豊かさ）】
───────────────────────────────────────
${result.richnessOfHeart}

───────────────────────────────────────
【四、お父さん・お母さんへのヒント・寄り添いの道標】
───────────────────────────────────────
${result.lifeAdvice}

───────────────────────────────────────
【結び：この子の未来を照らす、心のお守り言葉】
───────────────────────────────────────
${result.motto}

═══════════════════════════════════════
#JT日本将棋シリーズ #テーブルマークこども大会 #盤上人生録 #こども性格診断 #心の豊かさ`;
    }

    return `═══════════════════════════════════════
【盤上人生録】棋風から紐解く性格・生き様と心の豊かさ
═══════════════════════════════════════
■ 対局者：${name} 様（${gameLabel}・${sideText}）
■ 魂の肖像：『${result.archetype}』

───────────────────────────────────────
【一、性格の肖像と魂の特質】
───────────────────────────────────────
${result.personality}

───────────────────────────────────────
【二、盤上が語るあなたの生き様と決断の哲学】
───────────────────────────────────────
${result.lifePhilosophy}

───────────────────────────────────────
【三、あなたにとっての真の「心の豊かさ」とは何か】
───────────────────────────────────────
${result.richnessOfHeart}

───────────────────────────────────────
【四、魂がより軽やかになるための道標】
───────────────────────────────────────
${result.lifeAdvice}

───────────────────────────────────────
【結び：魂を導く座右の銘】
───────────────────────────────────────
${result.motto}

═══════════════════════════════════════
#盤上人生録 #性格診断 #生き様 #心の豊かさ`;
  };

  const handleCopyFullReport = async () => {
    const fullText = buildFullReportText();
    if (!fullText) return;

    const success = await robustCopyText(fullText);

    if (success) {
      setCopyStatus('success');
      setTimeout(() => setCopyStatus(''), 3500);
    } else {
      setShowManualModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-stone-800 font-serif antialiased selection:bg-amber-200 selection:text-stone-900 pb-24">
      
      {/* 上部ヘッダー */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all ${
              appMode === 'kids' 
                ? 'bg-gradient-to-br from-orange-400 to-amber-500 shadow-orange-900/10' 
                : 'bg-gradient-to-br from-amber-600 to-stone-700 shadow-amber-900/10'
            }`}>
              {appMode === 'kids' ? (
                <Baby className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Compass className="w-5 h-5 stroke-[2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  盤上人生録
                </h1>
                <span className={`text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full border ${
                  appMode === 'kids'
                    ? 'bg-orange-100 text-orange-900 border-orange-300/80'
                    : 'bg-amber-100 text-amber-900 border-amber-300/60'
                }`}>
                  {appMode === 'kids' ? '親子・こども診断版' : '一般・深層人生録版'}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-sans">
                {appMode === 'kids' 
                  ? 'JT将棋日本シリーズ・こども大会対応｜指し手と考慮時間から子の才能を紐解く'
                  : '棋風と時間の呼吸から、あなたの生き様と「真の心の豊かさ」を紐解く'}
              </p>
            </div>
          </div>

          {/* モード切替 ＆ ゲーム種別 */}
          <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
            
            {/* モード切り替え */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/90 shadow-2xs">
              <button
                onClick={() => { setAppMode('kids'); setResult(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  appMode === 'kids'
                    ? 'bg-white text-orange-800 shadow-xs ring-1 ring-orange-200'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Baby className="w-3.5 h-3.5 text-orange-500" />
                こども・親子向け
              </button>
              <button
                onClick={() => { setAppMode('adult'); setResult(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                  appMode === 'adult'
                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <User className="w-3.5 h-3.5 text-stone-600" />
                一般・大人向け
              </button>
            </div>

            {/* ゲーム種別 */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/90">
              <button
                onClick={() => setGameType('shogi')}
                className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                  gameType === 'shogi' 
                    ? 'bg-white text-stone-900 shadow-xs font-semibold' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                将棋
              </button>
              <button
                onClick={() => setGameType('chess')}
                className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                  gameType === 'chess' 
                    ? 'bg-white text-stone-900 shadow-xs font-semibold' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                チェス
              </button>
            </div>

            {/* セキュリティ保護中バッジ（APIキーはサーバー側で完全秘匿） */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium" title="APIキーはVercelサーバー側で保護されています">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AIエンジン接続保護済</span>
            </div>

          </div>

        </div>
      </header>

      {/* JT杯・こども大会アピールバナー */}
      {appMode === 'kids' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-stone-50 border-b border-orange-200/60 py-2.5 px-4 font-sans text-xs text-orange-950">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                <strong>JT将棋日本シリーズ・テーブルマークこども大会</strong>の対局記録や将棋アプリの棋譜から、お子さんの「才能」「生きるチカラ」「心の豊かさ」を紐解きます。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-orange-200 font-medium text-orange-800">
                <Clock className="w-3 h-3 text-orange-600" />
                考慮時間の長考も自動判定
              </span>
            </div>
          </div>
        </div>
      )}

      {/* メイングリッド */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左側：棋譜入力フォーム */}
        <section className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 font-sans uppercase tracking-wider flex items-center gap-1.5">
                <Scroll className="w-4 h-4 text-amber-600" />
                {appMode === 'kids' ? 'お子さんの棋譜を貼り付け' : 'あなたの棋譜を貼り付け'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs font-sans px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 border border-amber-200 transition-colors cursor-pointer"
                  title="クリップボードの内容を貼り付け"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-700" />
                  貼付
                </button>
                {pgnInput && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-sans px-2.5 py-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {/* 考慮時間対応のプレースホルダー */}
            <div className="relative">
              <textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                rows={12}
                placeholder={
                  gameType === 'shogi'
                    ? (appMode === 'kids' 
                        ? "【こども大会や将棋アプリの棋譜を貼り付けてください】\n※ 消費時間（例: ( 1:20/00:04:15) や 30秒 など）が含まれていれば、難しい局面でじっくり考え抜いた粘り強さも自動で判定します。\n\n例:\n1 ７六歩(77) ( 0:02/00:00:02)\n2 ３四歩(33) ( 0:03/00:00:03)\n3 ２六歩(27) ( 0:15/00:00:17) ..."
                        : "【将棋の棋譜テキスト（KIF / 1行表記 / 消費時間付き）】\n※ 思考時間の長考・緩急が記載されている場合、意思決定のリズムとして分析に反映されます。\n\n例:\n1 ７六歩(77) 2 ３四歩(33) 3 ２六歩(27) ...")
                    : "【チェスの棋譜テキスト（PGN / クロック時間付き可）】\n\n例:\n1. e4 e5 {[%clk 0:04:55]} 2. Nf3 Nc6 {[%clk 0:04:40]} ..."
                }
                className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl p-3.5 font-mono text-xs text-stone-700 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-100 resize-y leading-relaxed"
              />
            </div>

            {/* 考慮時間が検出された場合のバッジ */}
            {pgnInput && (
              <div className="flex items-center gap-1.5 text-[11px] font-sans text-stone-600 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {extractTimePatterns(pgnInput)
                    ? `思考時間データを検出：${extractTimePatterns(pgnInput).summary}（長考・緩急を考慮）`
                    : '思考時間表記なし（手順の気配と手筋から心理的呼吸を推察します）'}
                </span>
              </div>
            )}

            {/* 対局者情報 */}
            <div className="grid grid-cols-2 gap-3 pt-1 font-sans">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-stone-400" />
                  {appMode === 'kids' ? 'お子さんのお名前 / 愛称' : 'お名前（任意）'}
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                  placeholder={appMode === 'kids' ? '例: そうたくん / はなちゃん' : '例: あなたのお名前'}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 flex items-center gap-1">
                  <Swords className="w-3 h-3 text-stone-400" />
                  手番
                </label>
                <select
                  value={playerSide}
                  onChange={(e) => setPlayerSide(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                >
                  <option value={gameType === 'shogi' ? 'sente' : 'white'}>
                    {gameType === 'shogi' ? '先手' : '白番 (White)'}
                  </option>
                  <option value={gameType === 'shogi' ? 'gote' : 'black'}>
                    {gameType === 'shogi' ? '後手' : '黒番 (Black)'}
                  </option>
                </select>
              </div>
            </div>

            {/* 診断実行ボタン */}
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !pgnInput.trim()}
              className={`w-full py-3.5 px-4 rounded-xl font-bold font-sans text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all ${
                isLoading || !pgnInput.trim()
                  ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                  : appMode === 'kids'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-900/10 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/10 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{appMode === 'kids' ? 'お子さんの才能と思考の呼吸を思索中...' : '生き様と心の豊かさを思索中...'}</span>
                </>
              ) : (
                <>
                  {appMode === 'kids' ? (
                    <Baby className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <Feather className="w-4 h-4 stroke-[2]" />
                  )}
                  <span>
                    {appMode === 'kids' 
                      ? 'お子さんの性格・才能・心の豊かさを診断する' 
                      : '性格・生き様と心の豊かさを診断する'}
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-stone-400 text-center font-sans">
              ※ 技術や勝敗の解説ではなく、人としての気質・強み・心の豊かさを文章で紐解きます
            </p>
          </div>
        </section>

        {/* 右側：診断結果表示エリア */}
        <section className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              
              {/* 一発コピー用トップバナー */}
              <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-stone-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-stone-900 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{appMode === 'kids' ? 'お子さんの成長・才能診断書が整いました' : '診断結果が美しく整いました'}</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {appMode === 'kids'
                      ? '「一発コピー」を押すと、ご家族のLINEやおじいちゃん・おばあちゃんへそのまま送れる全文が保存されます'
                      : 'ボタンを押すだけで全文がコピーされ、LINEやDiscord、メモ帳へそのまま貼り付けられます'}
                  </p>
                </div>
                
                <button
                  onClick={handleCopyFullReport}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer ${
                    copyStatus === 'success'
                      ? 'bg-emerald-600 text-white shadow-emerald-900/10 scale-102 ring-2 ring-emerald-300'
                      : appMode === 'kids'
                        ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-md active:scale-98'
                        : 'bg-stone-900 hover:bg-stone-800 text-white hover:shadow-md active:scale-98'
                  }`}
                >
                  {copyStatus === 'success' ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
                      <span>全文コピー完了！LINEに貼れます</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-300" />
                      <span>{appMode === 'kids' ? '診断結果を一発コピー（共有用）' : '検討結果を一発コピー'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 診断書本体：文芸調カード */}
              <article className={`bg-white rounded-3xl border shadow-sm p-7 sm:p-9 space-y-8 relative overflow-hidden ${
                appMode === 'kids' ? 'border-orange-200/90' : 'border-stone-200/90'
              }`}>
                {/* こども版認定証風オーナメント */}
                {appMode === 'kids' && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-100 to-transparent px-6 py-2 text-right">
                    <span className="text-[10px] font-sans font-bold text-orange-800 tracking-wider flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-600" />
                      JT将棋日本シリーズ・こども大会仕様
                    </span>
                  </div>
                )}
                
                {/* 肖像タイトル */}
                <div className="border-b border-stone-200/80 pb-6 text-center space-y-2 pt-1">
                  <span className={`text-[11px] font-sans font-semibold tracking-widest px-3.5 py-1 rounded-full uppercase inline-flex items-center gap-1.5 ${
                    appMode === 'kids' 
                      ? 'text-orange-900 bg-orange-100/80' 
                      : 'text-amber-800 bg-amber-100/70'
                  }`}>
                    {appMode === 'kids' && <Award className="w-3.5 h-3.5 text-orange-600" />}
                    {appMode === 'kids' ? 'お子さんの輝く肖像・才能認定' : '魂の肖像'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-snug pt-1">
                    『{result.archetype}』
                  </h2>
                  <p className="text-xs text-stone-500 font-sans">
                    {appMode === 'kids' 
                      ? `対局者：${playerName.trim() || 'お子さん'} さん（${gameType === 'shogi' ? '将棋' : 'チェス'}・${playerSide === 'sente' || playerSide === 'white' ? '先手' : '後手'}）`
                      : `対局者：${playerName.trim() || 'あなた'} 様`}
                  </p>
                </div>

                {/* 思考時間データの特記事項がある場合に表示 */}
                {timeAnalysisInfo && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 font-sans text-xs text-stone-800 flex items-start gap-3">
                    <Hourglass className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-2">
                        <span>盤上の時間の呼吸（思考リズムの分析）</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-amber-200 text-amber-800">
                          {timeAnalysisInfo.summary}
                        </span>
                      </div>
                      <p className="text-stone-700 leading-relaxed">
                        {timeAnalysisInfo.trait} {timeAnalysisInfo.advice}
                      </p>
                    </div>
                  </div>
                )}

                {/* 第一章：性格の肖像・才能 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-sans tracking-wider text-amber-900 flex items-center gap-2 uppercase">
                    <Smile className="w-4 h-4 text-amber-600" />
                    {appMode === 'kids' ? '第一章：お子さんの輝く才能と性格の肖像' : '第一章：性格の肖像と魂の特質'}
                  </h3>
                  <div className={`p-5 sm:p-6 rounded-2xl border text-[15px] leading-relaxed whitespace-pre-line ${
                    appMode === 'kids' ? 'bg-[#FFFDF9] border-orange-200/60 text-stone-800' : 'bg-[#FAF8F5] border-stone-200/80 text-stone-800'
                  }`}>
                    {result.personality}
                  </div>
                </div>

                {/* 第二章：生き様・生きるチカラ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-sans tracking-wider text-stone-900 flex items-center gap-2 uppercase">
                    {appMode === 'kids' ? <Award className="w-4 h-4 text-orange-600" /> : <CompassIcon className="w-4 h-4 text-amber-600" />}
                    {appMode === 'kids' ? '第二章：盤上が教えてくれる、この子の生きるチカラ' : '第二章：盤上が語るあなたの生き様と決断の哲学'}
                  </h3>
                  <div className="text-stone-800 text-[15px] leading-loose whitespace-pre-line px-1">
                    {result.lifePhilosophy}
                  </div>
                </div>

                {/* 第三章：心の豊かさ */}
                <div className="space-y-3 bg-gradient-to-br from-amber-50/70 via-stone-50 to-orange-50/40 p-6 sm:p-8 rounded-2xl border border-amber-200/80 shadow-2xs">
                  <h3 className="text-xs font-bold font-sans tracking-wider text-amber-950 flex items-center gap-2 uppercase">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-100" />
                    {appMode === 'kids' ? '第三章：この子の心が真に満たされる瞬間（心の豊かさ）' : '第三章：あなたにとっての真の「心の豊かさ」とは何か'}
                  </h3>
                  <div className="text-stone-800 text-[15px] leading-loose whitespace-pre-line pt-1">
                    {result.richnessOfHeart}
                  </div>
                </div>

                {/* 第四章：親御さんへのヒント / 人生のアドバイス */}
                {result.lifeAdvice && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold font-sans tracking-wider text-stone-700 flex items-center gap-1.5 uppercase">
                      {appMode === 'kids' ? (
                        <MessageCircleHeart className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Sparkle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {appMode === 'kids' ? '第四章：お父さん・お母さんへのヒント・寄り添いの道標' : '第四章：魂がより軽やかになるための道標'}
                    </h3>
                    <div className={`p-5 rounded-2xl border text-stone-800 text-sm leading-relaxed ${
                      appMode === 'kids' 
                        ? 'bg-orange-50/50 border-orange-200/80' 
                        : 'bg-amber-50/40 border-amber-200/60'
                    }`}>
                      {result.lifeAdvice}
                    </div>
                  </div>
                )}

                {/* 第五章：座右の銘 / お守り言葉 */}
                <div className="pt-4 border-t border-stone-200/80">
                  <div className={`p-6 sm:p-7 rounded-2xl relative overflow-hidden shadow-md space-y-3 ${
                    appMode === 'kids' 
                      ? 'bg-gradient-to-br from-stone-900 to-amber-950 text-stone-100' 
                      : 'bg-stone-900 text-stone-100'
                  }`}>
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-sans font-semibold">
                      <Quote className="w-4 h-4" />
                      <span>{appMode === 'kids' ? 'この子の未来を照らす、心のお守り言葉' : '魂を導く座右の銘'}</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-amber-50 leading-relaxed">
                      {result.motto}
                    </p>
                  </div>
                </div>

                {/* 最下部の一発コピーボタン */}
                <div className="pt-2 flex flex-col items-center gap-2 font-sans">
                  <button
                    onClick={handleCopyFullReport}
                    className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer ${
                      copyStatus === 'success'
                        ? 'bg-emerald-600 text-white shadow-emerald-900/10'
                        : appMode === 'kids'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-md active:scale-98'
                          : 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md active:scale-98'
                    }`}
                  >
                    {copyStatus === 'success' ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
                        <span>全文コピー完了！LINEやメモ帳に貼り付けできます</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{appMode === 'kids' ? '診断結果を一発コピーして家族に送る' : 'すべての検討結果を一発コピーする'}</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-stone-400 text-center">
                    {appMode === 'kids'
                      ? '※ ワンクリックで全文がコピーされます。ご家族のLINEや大会の記念メモ帳にそのままお使いいただけます。'
                      : '※ ワンクリックで全文がコピーされます。ご自身の振り返りやSNS共有にそのままお使いいただけます。'}
                  </span>
                </div>
              </article>
            </div>
          ) : (
            /* 未入力時の待機ガイドカード */
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed border-stone-200 bg-white/70 text-center space-y-6">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs ${
                appMode === 'kids' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                {appMode === 'kids' ? <Baby className="w-8 h-8 text-orange-600" /> : <Compass className="w-8 h-8 text-amber-700" />}
              </div>
              <div className="space-y-2 max-w-md font-sans">
                <h3 className="text-lg font-bold text-stone-900">
                  {appMode === 'kids' ? 'お子さんの棋譜から、才能と心の豊かさを紐解きます' : '棋風の呼吸から、生き様と心の豊かさを紐解きます'}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {appMode === 'kids'
                    ? '左側の枠に対局の棋譜（KIFや将棋アプリのテキスト）を貼り付けて「診断する」を押してください。消費時間がある場合は、難所での長考や決断の呼吸も自動分析します。'
                    : '左側の入力枠に将棋やチェスの棋譜を貼り付けて「診断する」を押してください。盤上の気配から、あなたの深層性格と生き様を随筆形式で描き出します。'}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 手動全選択コピー用モーダル */}
      {showManualModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm font-sans flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-600" />
                診断結果テキスト（手動コピー用）
              </h4>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500 font-sans">
              ブラウザの制限のため、枠内を全選択してコピーしてください：
            </p>
            <textarea
              ref={modalTextRef}
              readOnly
              value={buildFullReportText()}
              onFocus={(e) => e.target.select()}
              rows={10}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono text-stone-800 focus:outline-hidden"
            />
            <div className="flex justify-end gap-2 font-sans">
              <button
                onClick={() => {
                  if (modalTextRef.current) {
                    modalTextRef.current.select();
                    document.execCommand('copy');
                    setShowManualModal(false);
                    setCopyStatus('success');
                    setTimeout(() => setCopyStatus(''), 3500);
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                枠内を全選択してコピー
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
