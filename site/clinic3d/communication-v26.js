import {replies} from './clinic-dialogue.js';
// Authored teaching responses, not AI sentiment scoring or clinical findings.
export const REACTIONS = {
 skip_screening:["safety","我能走，可一拐弯脚就发软。这样站不会摔吗？"],
 cosmetic_goal:["goal","我倒不在乎脚好不好看，就是想走稳点。"],
 command_only:["consent","先跟我说说要怎么查，行吗？"],
 guarantee_no_pain:["promise","真不会疼吗？要是疼了能停吗？"],
 max_angle:['method','那是屏幕上的角度，怎么知道我的脚能动多少？'],
 heel_lift:["method","我刚才脚跟都抬起来了，这也算吗？"],
 different_method:["method","一边坐着量，一边站着量，也能比吗？"],
 talus_out:["premature","骨头错位了？怎么查出来的？"],
 force_target:["method","光顾着踩那块板，我走路都不自然了。"],
 power_from_picture:["premature","看我走几步，就知道是哪儿没劲吗？"],
 arch_to_sprain:["premature","那您怎么知道是韧带的问题？"],
 arch_cure:["promise","换双鞋垫，就真的不会再崴了？"],
 red_always_worse:["premature","这块红就说明伤得重吗？"],
 three_points:["premature","脚心碰着地，也有问题吗？"],
 cop_cause:["premature","看这条线就知道我为什么崴脚了？"],
 guaranteed_orthosis:["promise","光垫个鞋垫就够了？还用练吗？"],
 return_today:["safety","我走路还有点怕，现在就能跑了？"],
 push_through:["consent","我想先停一下，不舒服。"],
 test_anyway:["safety","我一踩地就疼，真站不了。"],
 single_cause_chain:["premature","有这么严重吗？您是怎么看出来的？"],
 arch_root:["premature","是脚弓低，还是有别的原因？"]
};
export function polite(text){return String(text||'').replace(/你(?!们)/gu,'您').replaceAll('回球场','恢复跑步').replaceAll('返场','恢复运动');}
export function patientLine(text){return polite(text);}
export function normalizeFlow(flow){for(const n of Object.values(flow)){n.text=n.speaker==='陈女士'?patientLine(n.text):polite(n.text);for(const o of n.options||[]){o.label=polite(o.label);if(o.shortLabel)o.shortLabel=polite(o.shortLabel);}}}
export function normalizeFilm(film){for(const c of film.clips)for(const group of [c.normal,...c.alternative.map(a=>a.lines)])for(const t of group)t.text=t.speaker==='patient'?patientLine(t.text):polite(t.text);}
export function reactionFor(optionId,attempt=1){
 const item=REACTIONS[optionId];if(!item)return null;
 const [kind,question]=item,serious=['consent','safety'].includes(kind),repeated=attempt>1;
 const text=repeated?(serious?'我不想接着做了，先停一下吧。':'这点我还没听明白，您能再说说吗？'):question;
 return {kind,text,emotion:repeated&&serious?'upset':repeated?'concerned':'questioning',attempt};
}
const corrections={"conditions_match":"红不红不能直接说明伤得重不重，得先看这两张图的颜色各代表什么。","request_conditions":"两张图是怎么测的，我得先确认一下。","distribution":"脚心贴地，本身不说明有病，还得看您哪儿不舒服。","arch_observed":"站起来脚弓低了些，只凭这一点看不出崴脚的原因。","alignment_checked":"屏幕上的角度只是示范，不能当成您脚踝的角度。","evidence_problem_plan":"光凭脚弓的样子，看不出是哪儿出了问题。","continue_consent":"我先说一下要怎么查，您有顾虑可以告诉我。","valid_pair":"刚才脚跟抬起来的那一下不算。两只脚都用同一个姿势量。"};
const byConcern={"skip_screening":{"ask_screening":"先不做单脚站。上次崴脚以后，有没有更疼、更肿，或者脚发麻？"},"cosmetic_goal":{"ask_goal":"那就先看走路稳不稳。上回崴脚之后，您做过什么治疗？"},"command_only":{"explain_consent":"我先看您自己能把脚抬多高，再轻轻动一下脚踝，看看稳不稳。可以吗？"},"different_method":{"valid_pair":"不能这么比。刚才一边站着、一边坐着，得换成一样的姿势再量。"},"power_from_picture":{"observe_only":"看不出来是哪块肌肉没劲，只能看出右脚踩地的时间短些。"},"arch_to_sprain":{"observe_only":"光看走路，看不出韧带受了多大的力。刚才看见的是两只脚步子不一样。"},"push_through":{"shared_stop":"好，现在就停，先扶稳。以后练的时候也是，越练越疼就别硬撑。"},"arch_cure":{"arch_not_cause":"不能保证。鞋垫合不合适，要看您走路的情况，不能只看脚弓。"},"test_anyway":{"medical_evaluation":"不用站，先坐着。我请医生看看需不需要拍片。"},"return_today":{"graded_control":"先不急着跑，咱们从能站稳的动作练起。","mobility_recheck":"先不跑，看看脚踝活动能不能好一些，下次再量。","load_support_trial":"先不跑。您站久了会酸，先试试中间坐下来歇会儿。","complete_missing":"先不跑，等剩下几项查完再定。"},"guaranteed_orthosis":{"graded_control":"鞋垫不能保证不再崴。脚踝用力和站稳也得练，下次来看看走路有没有好些。","mobility_recheck":"鞋垫不能保证不再崴。先练脚踝往上抬，下次来再量一量。","load_support_trial":"单靠鞋垫说不准。您先把站的时间分开，中间歇会儿，下次看看还酸不酸。","complete_missing":"光用鞋垫不一定够。下次查完脚踝怎么用力，再定怎么练。"}};
export const repairSpoken=(o,concern)=>byConcern[concern]?.[o.id]||corrections[o.id]||replies[o.id]||null;
export function repairLabel(o,concern){return o.good===false||o.retry?(o.shortLabel||o.label):(repairSpoken(o,concern)||o.shortLabel||o.label);}
export const REPAIR_ACK="好。";
