// Only these roles address one another. A button label is never a spoken line.
export const voiceRole=name=>({'林治疗师':'therapist','治疗师':'therapist','陈女士':'patient','患者':'patient','教学旁白':'narrator'})[name]??null;
export const replies={
 ask_trigger:'您第一次是怎么崴的脚？',
 ask_screening:'您最近又扭过脚吗？脚踝有没有比以前更肿、更疼？有没有脚发麻，或者不敢踩地面的情况？',
 ask_goal:'当时去医院看过吗？现在您最想恢复什么？',
 ask_fear:'走到不平的地方，是脚踝突然使不上劲，还是怕再崴，就不敢往前走？',
 explain_consent:'我需要给您检查一下，看看您的踝关节韧带有没有松弛的情况。如果您感觉有点疼痛，您可以跟我说具体是哪里有点疼。不要强忍着。',
 reassure_without_guarantee:'没事的，我们慢慢来，如果您感觉疼随时和我说就好。',
 respect_decline:'那今天先不做，行吗？',
 pain_stop:'先停一下，别再往前压了。',
 limited_inference:'发紧不等于骨头错位。您先别硬往前压。',
 natural_walk:'照平常那样走就行，不用找板子踩。',
 observe_only:'刚才走的时候，右脚踩地的时间短一些。光看这几步，还说不准为什么。',
 arch_not_cause:'脚弓低不一定就是崴脚的原因，先别急着配鞋垫。',
 cop_limit:'这条线画的是脚底受力的位置怎么变。单看它，说不准您为什么崴脚。',
 graded_control:'先练脚踝用力和站稳，等做起来轻松了，再加一点难度。',
 mobility_recheck:'先练脚踝往上抬，下次还用今天的办法量一量。',
 load_support_trial:'您站久了会酸，可以中间坐下歇一歇。下回看看有没有好些，再谈要不要用鞋垫。',
 complete_missing:'还有几项没查，下次查完再定怎么练。',
 shared_stop:'要是越练越疼，或者站不稳，先扶好、停下来。回家碰上这种情况，您打算怎么办？',
 medical_evaluation:'先坐下，别勉强踩地。我请医生看看需不需要拍片。'
};
// These choices are spoken directly to the patient before her response.
export const spokenCommunicationChoices=new Set([
 'skip_screening','cosmetic_goal','command_only','guarantee_no_pain','talus_out',
 'force_target','guaranteed_orthosis','return_today','push_through'
]);
export const archRequest='我想再看看您的足弓，坐着、站着各看一次。';
export const archHistory=[
 {speaker:'patient',text:'我站久了，这脚内侧就酸。'},
 {speaker:'therapist',text:archRequest}
];
export const flowLines={
 trigger_answer:'快一年前吧，我下楼梯没踩稳，右脚往里一崴，外脚踝一下就疼了。后来走不平的路又崴过，上个月跑步拐弯时也崴了一次。',
 safety_answer:'最近没再扭，也没发麻，还能走。就是站久了或者走多了会酸胀，坐会儿就好些。',
 goal_answer:'头一回拍了片，说没骨折。歇了大概三个星期，后来再崴就自己歇歇，没专门练，也没一直戴护踝。现在就想走不平的路能踏实点，以后还能慢跑。',
 consent_reply:'可以。碰到上次崴的地方会不会疼？',
 local_intro:'接下来我为您检查一下脚踝活动度怎么样。',
 trial:'双手扶墙，我在您旁边。脚跟踩稳，膝盖对着第二个脚趾，慢慢往前碰墙。',
 local_record:'右脚踝有点紧，再往前，脚跟就要起来了。',
 gait_intro:'就这么光脚走？要对准地上那块板吗？',
 arch_intro:'刚才您一踩地，我看右脚内侧的弧度好像变浅了。'+archRequest,
 arch_concern:'这个要看您站立的时候足弓的情况，接下来我们用足底压力测试系统来检查一下。',
 pressure_intro:'我看看您站着和走路的时候，脚底哪里受力多。',
 balance_intro:'接下来，看看您站着的时候平衡怎么样。',
 muscle_intro:'我想测一下您两边脚踝的力量，可以吗？',
 cop_explain:'这条线往里拐，跟我老崴脚有关系吗？',
 plan_patient:'好，我先从简单的练起。',
 fear_reply:'都有。有时一拐弯，右脚就突然一软。有时候脚还好好的，看见路不平，我自己先慢下来了。',
 ankle_stress:'陈女士，您先坐到床边，再慢慢躺下。',
 symptom_stop:'先扶好，我陪您坐下。现在是哪儿不舒服？',
 decline_stop:'我还是有点怕，今天先不查了。'
};
export const filmFallback={
 stop:[['therapist','今天先不站了，您坐这儿歇会儿。'],['patient','好，我坐一会儿。']],
 consent:[['therapist','我先给您做个示范，可以吗？'],['patient','行，我先看看。']]
};
// T = therapist, P = patient. Scene key and condition stay separate from dialogue.
export const scanColourExplanation='您看，蓝色的地方压力较低，到了绿色和黄色，压力逐渐增大。橙色和红色的地方，压力比较高。';
export const scenes={
 '01A':{
 normal:'T陈女士，您好，我是林治疗师。最近哪里不舒服？|P右脚这一年崴了三次。现在走路最怕它突然一软。',
 history_not_obtained:'T走路的时候，什么最让您不放心？|P路稍微不平，我就怕再崴。',
 declined:'P我想先问问，今天不查行吗？|T可以，您说。'},
 '01B':{
 normal:'P医生，我这个严重吗？',
 screening_or_goal_missing:'T动之前我再问一句：最近又扭过吗？脚有没有更疼、更肿，或者发麻？|P最近没再扭，也没发麻，走路还行。',
 new_injury_or_unable_to_bear_weight:'P刚又扭了一下，疼得不敢踩地。|T先别站，您坐着。我请医生过来看看。',
 declined:'P我还是想下次再查。|T可以，今天就先不查。'},
 '02A':{
 normal:'T接下来我为您检查一下脚踝活动度怎么样。|P好。',
 consent_missing:'T接下来我为您检查一下脚踝活动度怎么样。|P好。',
 declined:'P今天我不想让人碰脚，能先看看怎么做吗？|T行，我做给您看。',
 stopped:'P等一下，有点不舒服。|T先停，哪儿不舒服？'},
 '02B':{
 normal:'P总觉得紧，是不是骨头错位了？|T光凭发紧看不出来。两只脚得用同样的姿势量，才能比较。',
 local_check_not_performed:'P那我右脚是不是比左脚紧？|T两边还没量过，现在说不准。',
 stopped_before_valid_comparison:'P刚才有点疼，我不想再往前了。|T那就停，不用再碰墙了。',
 declined:'P我暂时不想再试。|T行，今天就量到这儿。'},
 '03A':{
 normal:'T陈女士，请坐到治疗床边，把两边裤腿往上收一点，我测一下您脚踝的力量。|P可以。|T我们先查左脚，再查右脚。',
 muscle_learning_skipped:'P能看出是哪边没劲吗？|T还没比过两边的力气，现在说不准。',
 declined:'P今天不想试用力了。|T行，那这项先不做。',
 stopped:'P一使劲就不舒服。|T先放松。刚才是哪儿不舒服？'},
 '03B':{
 normal:'P我明明能把脚往外转，怎么还觉得没劲？|T能转得动，和顶着我的手还能使多大劲，是两回事。|P那您看我走几步，能看出来吗？|T走路能看出两边有什么不同，但看不出是哪块肌肉慢了。',
 muscle_learning_incomplete:'P是右脚劲儿小吗？|T还没测过，光凭发软说不准。',
 refused_or_stopped:'P今天先别测力气了。|T行。'},
 '04A':{
 normal:'T先坐着，我看一下脚弓。|P我站久了，这脚内侧就酸。|T那您扶着站起来，我看看站着时有什么变化。',
 declined_or_unsafe_to_stand:'P现在不太想站。|T那就坐着，不勉强。',
 stopped:'P站着有点难受，我想坐下。|T来，椅子在这儿。'},
 '04B':{
 normal:'P我脚弓低，所以才老崴脚吗？|T这个要看您站立的时候足弓的情况，接下来我们用足底压力测试系统来检查一下。',
 arch_check_not_performed:'P我的脚弓是不是一站就塌下去了？|T这个要看您站立的时候足弓的情况，接下来我们用足底压力测试系统来检查一下。',
 declined_or_stopped:'P鞋垫的事能下次再说吗？|T可以，今天先歇会儿。'},
 '05A':{
 normal:'T照平常那样走就行，不用找板子踩。|P我就怕一拐弯又崴了。|T那先走直线，按您平常的速度就行。',
 shoes_or_socks_still_on:'T我想看看您光脚走路的样子，方便坐下脱一下鞋袜吗？|P行，我坐这儿脱。',
 declined:'P这段我不想走了。|T好，旁边有椅子，您坐会儿。',
 new_symptoms_or_stopped:'P走起来比刚才还难受。|T先别走了，扶好。是哪儿更难受了？'},
 '05B':{
 normal:'T陈女士，结合您反复崴脚、右脚走路时容易发软的情况，我们考虑慢性踝关节不稳。|T这不是您娇气，也不是您没养好，是身体在换一种走法保护右脚。|T您看这张脚印图，右脚刚踩下去的时候，脚底外侧吃的力更多。|T右脚单独撑地的时间短了，左脚很快就落下来帮忙，所以两只脚一起着地的时间长了。|T右脚离地前，脚踝往前推的劲儿小了，两边的步子也迈得小。|T您看这里，右腿往前迈的时候，髋部帮的忙更多，所以两边走起来不太一样。',
 gait_task_not_performed:'P走这几步够看吗？|T刚才中间停了，两边还不好比。',
 events_not_marked:'T我把录像放慢，您看这只脚什么时候落地、什么时候抬起来。|P这样看清楚多了。',
 declined_or_stopped:'P刚才没走完，还用再走吗？|T不用，先休息。'},
 '06A':{
 normal:'T您看这张脚印图。|P这块红，是伤得厉害吗？|T红色表示这里受的压力大些，不能拿它判断伤得重不重。',
 pressure_data_missing:'P刚才没测出来，还能看吗？|T我可以拿张图给您讲怎么看，但它不是您脚上的结果。',
 declined_or_stopped:'P我不想再站了。|T好，您坐。'},
 '06B':{
 normal:'T'+scanColourExplanation,
 conditions_not_checked:'T'+scanColourExplanation,
 pressure_not_performed:'T'+scanColourExplanation,
 partial_contact_or_stopped:'P刚才没踩全，也算吗？|T那一步少了一块，不能拿来比。'},
 '07A':{
 normal:'T接下来，看看您站着的时候平衡怎么样。|T请先扶着栏杆站到圆盘中间，我在您身边。|T站稳后松开手，双眼看前方。|T要是站不稳，就扶住栏杆，我们停下来。',
 declined:'P今天不想再站了。|T行，您坐会儿。',
 setup_not_safe:'T先别起身，我把扶手挪近一点。|P好。',
 new_symptoms_or_stopped:'P站着不太舒服。|T先扶好，两只脚都放下来。'},
 '07B':{
 normal:'P我得把脚放下了。|T扶好。是疼，还是觉得站不住？|P不怎么疼，就是怕摔。我这脚是不是感觉不灵了？|T站不稳有好几种原因，光凭这一下还看不出来。',
 balance_not_performed:'P不站的话，能知道我为什么容易晃吗？|T现在还看不出来。下次可以先扶着试试。',
 completed_without_stop:'P刚才站住了，心里还是有点慌。|T刚才最怕的是哪一下？|P刚抬脚的时候，怕自己往旁边倒。',
 new_symptoms:'P现在比刚才疼。|T那就不再站了。我扶您坐下，看看哪儿疼。'},
 '08A':{
 normal:'T要是先挑一件最想做的事，您会选什么？|P我想先走稳一点，路不平也敢走。跑步可以晚点再说。|T行，下次来，您跟我说说走那段路还怕不怕。',
 goal_not_obtained:'T您现在最想做、又不太敢做的是什么？|P走那种坑坑洼洼的路。',
 several_checks_skipped:'P那回去该怎么练？|T还有几项没查，先不急着加练，下次查完再定。',
 declined_or_medical_stop_route:'P今天没查完，回去还练吗？|T今天先不加练，等弄清楚为什么不舒服再说。'},
 '08B':{
 normal:'T我们按今天商量的计划复评。',
 plan_not_selected:'P那我回去先练什么？|T今天先不加新的动作，下次查完再定。',
 patient_does_not_understand:'P什么情况我就别练了？|T越练越疼，或者觉得要摔了，就先扶好、停下来。如果又扭伤，或者明显更疼、更肿，要及时看医生。',
 medical_stop_or_declined_route:'P剩下的今天还要做吗？|T不用，今天就到这儿。'}
};
export function editScenes(film){for(const c of film.clips){for(const [key,group] of [['normal',c],...c.alternative.map(a=>[a.condition,a])]){const script=scenes[c.id]?.[key];if(!script)continue;group[key==='normal'?'normal':'lines']=script.split('|').map(x=>({speaker:x[0]==='P'?'patient':'therapist',text:x.slice(1)}));}}}

