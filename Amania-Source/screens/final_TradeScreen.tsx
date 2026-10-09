import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEMO_TRADE_USER_ID } from '../services/mockTradeRepository';
import { useTradeRepository } from '../services/TradeRepositoryProvider';
import { generateGoodsDescription, inspectGoodsPhoto, makeSkillIcebreaker, AiSource, GoodsReview } from '../services/tradeAiService';
import { GoodsListing, MatchMessage, SkillMatch, TradeSnapshot, UserProfile } from '../services/tradeTypes';

const C = { green: '#153728', pale: '#EAF1E8', paper: '#F6F7F1', orange: '#E98151', lime: '#D9EF9A', ink: '#17231D', muted: '#748078', white: '#FFFFFF', line: '#E1E6DE', soft: '#F0F2EC', danger: '#983F2C' };
const FILTERS = ['All', 'Lab Gear', 'Calculators', 'Textbooks', 'Electronics'];
const CATEGORIES = FILTERS.slice(1);
const EMPTY: TradeSnapshot = { users: [], skills: [], swipes: [], matches: [], messages: [], goods: [] };

const sellerFor = (snapshot: TradeSnapshot, id: string) => snapshot.users.find((user) => user.id === id);
const skillFor = (snapshot: TradeSnapshot, id: string) => snapshot.skills.find((skill) => skill.userId === id);
const formatPrice = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function TradeScreen() {
  const repository = useTradeRepository();
  const [snapshot, setSnapshot] = useState(EMPTY);
  const snapshotRef = useRef(snapshot);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<'skills' | 'goods'>('skills');
  const [category, setCategory] = useState('All');
  const [swipeBusy, setSwipeBusy] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [newMatch, setNewMatch] = useState<SkillMatch | null>(null);
  const [activeMatch, setActiveMatch] = useState<SkillMatch | null>(null);
  const [chatMessages, setChatMessages] = useState<MatchMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [listModalOpen, setListModalOpen] = useState(false);
  const [pickedPhoto, setPickedPhoto] = useState('');
  const [listingTitle, setListingTitle] = useState('');
  const [listingCategory, setListingCategory] = useState(CATEGORIES[0]);
  const [listingDescription, setListingDescription] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [review, setReview] = useState<GoodsReview | null>(null);
  const [reviewContext, setReviewContext] = useState<{ title: string; category: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [writingDescription, setWritingDescription] = useState(false);
  const [aiSource, setAiSource] = useState<AiSource | null>(null);
  const [savingListing, setSavingListing] = useState(false);
  const currentUser = sellerFor(snapshot, DEMO_TRADE_USER_ID) ?? null;
  const ownSwipes = useMemo(() => snapshot.swipes.filter((item) => item.swiperUserId === DEMO_TRADE_USER_ID), [snapshot.swipes]);
  const ownSwipeByUser = useMemo(() => new Map(ownSwipes.map((item) => [item.targetUserId, item])), [ownSwipes]);
  const candidates = useMemo(() => {
    const profiles = snapshot.skills.filter((item) => item.userId !== DEMO_TRADE_USER_ID);
    const unseen = profiles.filter((item) => !ownSwipeByUser.has(item.userId));
    const previouslyViewed = profiles
      .filter((item) => ownSwipeByUser.get(item.userId)?.action === 'PASS')
      .sort((a, b) => (ownSwipeByUser.get(a.userId)?.timestamp ?? 0) - (ownSwipeByUser.get(b.userId)?.timestamp ?? 0));
    return [...unseen, ...previouslyViewed];
  }, [snapshot.skills, ownSwipeByUser]);
  const candidate = candidates[0];
  const candidateUser = candidate ? sellerFor(snapshot, candidate.userId) : undefined;
  const candidateWasViewed = candidate ? ownSwipeByUser.get(candidate.userId)?.action === 'PASS' : false;
  const activeMatches = useMemo(() => snapshot.matches.filter((match) => match.status === 'ACTIVE' && (match.userAId === DEMO_TRADE_USER_ID || match.userBId === DEMO_TRADE_USER_ID)), [snapshot.matches]);
  const visibleMatch = activeMatch ? snapshot.matches.find((item) => item.id === activeMatch.id) ?? activeMatch : null;
  const filteredGoods = useMemo(() => snapshot.goods.filter((item) => item.status === 'AVAILABLE' && item.isApprovedByAi && (category === 'All' || item.category === category)), [snapshot.goods, category]);
  const suggestedPrice = Number(mrp) > 0 ? Math.max(50, Math.round((Number(mrp) * 0.4) / 50) * 50) : 0;
  const reload = useCallback(async () => { setSnapshot(await repository.getSnapshot()); }, [repository]);
  useEffect(() => { let active = true; void repository.getSnapshot().then((loaded) => { if (active) { snapshotRef.current = loaded; setSnapshot(loaded); setReady(true); } }); return () => { active = false; }; }, [repository]);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { if (!activeMatch) return; let active = true;
    void (async () => {
      try {
        const saved = await repository.getMatchMessages(activeMatch.id);
        if (saved.length) { if (active) setChatMessages(saved); return; }
        const otherId = activeMatch.userAId === DEMO_TRADE_USER_ID ? activeMatch.userBId : activeMatch.userAId;
        const latest = snapshotRef.current;
        const other = sellerFor(latest, otherId);
        const self = sellerFor(latest, DEMO_TRADE_USER_ID);
        if (!other) throw new Error('This student profile is no longer available.');
        if (!self) throw new Error('Your demo student profile is unavailable.');
        const icebreaker = await makeSkillIcebreaker(self, skillFor(latest, DEMO_TRADE_USER_ID), other, skillFor(latest, otherId));
        const message = await repository.addMessage(activeMatch.id, 'gemma-4', icebreaker.text, true);
        if (active) { setChatMessages([message]); if (icebreaker.source === 'Offline demo') setChatError('Gemma 4 is offline; using the local demo icebreaker.'); }
        await reload();
      } catch (error) { if (active) setChatError(error instanceof Error ? error.message : 'Could not prepare the icebreaker.'); }
      finally { if (active) setChatLoading(false); }
    })();
    return () => { active = false; };
  }, [activeMatch, reload, repository]);

  const handleSwipe = useCallback(async (action: 'LIKE' | 'PASS') => {
    if (!candidate || swipeBusy) return;
    setSwipeBusy(true);
    try {
      const match = await repository.recordSwipe({ swiperUserId: DEMO_TRADE_USER_ID, targetUserId: candidate.userId, action, timestamp: Date.now() });
      await reload();
      if (match) setNewMatch(match);
    } catch { Alert.alert('Could not save this swipe', 'Check device storage and try again.'); }
    finally { setSwipeBusy(false); }
  }, [candidate, reload, repository, swipeBusy]);
  const resetDeck = async () => { await repository.resetSkillDeck(DEMO_TRADE_USER_ID); await reload(); };
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_event, gesture) => { if (gesture.dx > 115) void handleSwipe('LIKE'); else if (gesture.dx < -115) void handleSwipe('PASS'); },
  }), [handleSwipe]);

  const openChat = (match: SkillMatch) => { setMatchesOpen(false); setNewMatch(null); setChatMessages([]); setChatError(''); setChatLoading(true); setActiveMatch(match); };
  const sendMessage = async () => {
    if (!visibleMatch || !chatDraft.trim() || visibleMatch.messageCount >= visibleMatch.maxMessages || chatLoading) return;
    setChatLoading(true); setChatError('');
    try {
      await repository.addMessage(visibleMatch.id, DEMO_TRADE_USER_ID, chatDraft.trim());
      setChatDraft('');
      setChatMessages(await repository.getMatchMessages(visibleMatch.id));
      await reload();
    } catch (error) { setChatError(error instanceof Error ? error.message : 'Message could not be sent.'); }
    finally { setChatLoading(false); }
  };

  const chooseGoodPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo access needed', 'Allow photo access to add a good to the campus exchange.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
    const uri = picked.canceled ? '' : picked.assets[0]?.uri;
    if (!uri) return;
    setPickedPhoto(uri); setReview(null); setReviewContext(null); setReviewing(true);
    try {
      const checkedTitle = listingTitle.trim() || 'Campus item';
      const result = await inspectGoodsPhoto(checkedTitle, listingCategory, uri);
      setReview(result);
      setReviewContext({ title: checkedTitle, category: listingCategory });
      if (!result.approved) Alert.alert('Photo not approved', result.reason);
      else if (result.source === 'Offline demo') Alert.alert('Demo photo review', 'This offline preview checks the title and category. Gemma 4 photo review runs when the scan server is connected.');
    } catch (error) { Alert.alert('Photo review failed', error instanceof Error ? error.message : 'Try again with another photo.'); }
    finally { setReviewing(false); }
  };
  const autoDescription = async () => {
    if (!pickedPhoto || !listingTitle.trim()) { Alert.alert('Add a photo and title first', 'Gemma 4 uses the image and title to draft the listing description.'); return; }
    setWritingDescription(true);
    try { const result = await generateGoodsDescription(listingTitle, listingCategory, Number(askingPrice) || suggestedPrice, Number(mrp) || 0, pickedPhoto); setListingDescription(result.text); setAiSource(result.source); }
    catch (error) { Alert.alert('Description unavailable', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setWritingDescription(false); }
  };
  const submitGood = async () => {
    if (!currentUser || !listingTitle.trim() || !pickedPhoto || !review?.approved || reviewing) { Alert.alert('Complete the listing first', 'Add a photo, title, and an approved photo review before posting.'); return; }
    setSavingListing(true);
    try {
      let finalReview = review;
      if (!reviewContext || reviewContext.title !== listingTitle.trim() || reviewContext.category !== listingCategory) {
        setReviewing(true);
        finalReview = await inspectGoodsPhoto(listingTitle.trim(), listingCategory, pickedPhoto);
        setReview(finalReview); setReviewContext({ title: listingTitle.trim(), category: listingCategory });
        setReviewing(false);
        if (!finalReview.approved) { Alert.alert('Photo not approved', finalReview.reason); return; }
      }
      const price = Number(askingPrice) || suggestedPrice;
      if (price <= 0) { Alert.alert('Add an asking price', 'Enter your asking price or add the retail MRP for a suggested campus price.'); return; }
      await repository.createGoodsListing({ sellerId: currentUser.id, title: listingTitle.trim(), category: listingCategory, imageUrl: pickedPhoto, description: listingDescription.trim() || `${listingTitle.trim()} available for campus pickup. Confirm its condition with the seller.`, askingPrice: price, suggestedMrp: Number(mrp) || 0, isApprovedByAi: true });
      await reload(); setListModalOpen(false); resetListing();
    } catch { Alert.alert('Could not post this good', 'Check device storage and try again.'); }
    finally { setReviewing(false); setSavingListing(false); }
  };
  const resetListing = () => { setPickedPhoto(''); setListingTitle(''); setListingCategory(CATEGORIES[0]); setListingDescription(''); setAskingPrice(''); setMrp(''); setReview(null); setReviewContext(null); setAiSource(null); };
  const copyContact = async () => {
    if (!activeMatch) return;
    const otherId = activeMatch.userAId === DEMO_TRADE_USER_ID ? activeMatch.userBId : activeMatch.userAId;
    const other = sellerFor(snapshot, otherId);
    if (!other?.phoneWhatsApp) { Alert.alert('No contact listed', 'This student has not shared a WhatsApp number in the demo profile.'); return; }
    await Clipboard.setStringAsync(other.phoneWhatsApp);
    if (Platform.OS === 'android') ToastAndroid.show('WhatsApp number copied. Meet in a public place on campus.', ToastAndroid.SHORT);
    else Alert.alert('Copied', 'WhatsApp number copied. Meet in a public place on campus.');
  };
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  if (!ready) return <View style={styles.loadingPage}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading the campus exchange…</Text></View>;
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.green} />}>
      <View style={styles.heading}><Text style={styles.eyebrow}>SHARE WHAT YOU KNOW · FIND WHAT YOU NEED</Text><Text style={styles.title}>Campus Trade</Text><Text style={styles.subtitle}>Skills, useful goods, and good people—all on campus.</Text></View>
      <View style={styles.sectionSwitch}><Pressable onPress={() => setSection('skills')} style={[styles.switchItem, section === 'skills' && styles.switchActive]}><Text style={[styles.switchText, section === 'skills' && styles.switchTextActive]}>Skill exchange</Text></Pressable><Pressable onPress={() => setSection('goods')} style={[styles.switchItem, section === 'goods' && styles.switchActive]}><Text style={[styles.switchText, section === 'goods' && styles.switchTextActive]}>Goods market</Text></Pressable></View>

      {section === 'skills' ? <>
        <View style={styles.skillsTop}><View><Text style={styles.eyebrow}>SKILL SWAPS</Text><Text style={styles.sectionTitle}>Find your exchange</Text></View><Pressable onPress={() => setMatchesOpen(true)} style={styles.matchesButton}><Text style={styles.matchesGlyph}>✓</Text><Text style={styles.matchesButtonText}>Matches · {activeMatches.length}</Text></Pressable></View>
        {candidate && candidateUser ? <View style={styles.deckArea} {...panResponder.panHandlers}>
          <View style={styles.cardShadow} /><View style={styles.skillCard}>
            {candidateWasViewed ? <Text style={styles.previouslyViewed}>PREVIOUSLY VIEWED</Text> : null}
            <View style={styles.profileIdentity}><View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>{candidateUser.name.trim().charAt(0).toUpperCase()}</Text></View><Text style={styles.profileName}>{candidateUser.name}</Text></View>
            <Text style={styles.skillLabel}>CAN TEACH / OFFERING</Text><View style={styles.tags}>{candidate.skillsOffering.map((skill) => <Text key={skill} style={styles.offerTag}>{skill}</Text>)}</View>
            <Text style={styles.skillLabel}>WANTS TO LEARN / NEEDED</Text><View style={styles.tags}>{candidate.skillsNeeded.map((skill) => <Text key={skill} style={styles.needTag}>{skill}</Text>)}</View>
            <View style={styles.swipeHint}><Text style={styles.passHint}>✕ PASS</Text><Text style={styles.dragHint}>Swipe to explore</Text><Text style={styles.likeHint}>✓ LIKE</Text></View>
          </View>
        </View> : <View style={styles.doneCard}><Text style={styles.doneIcon}>✳</Text><Text style={styles.doneTitle}>You’re all caught up.</Text><Text style={styles.muted}>New skill profiles will show here.</Text><Pressable onPress={() => void resetDeck()} style={styles.resetDeck}><Text style={styles.resetDeckText}>Restart demo deck</Text></Pressable></View>}
        {candidate ? <View style={styles.swipeButtons}><Pressable accessibilityLabel="Pass this profile" disabled={swipeBusy} onPress={() => void handleSwipe('PASS')} style={styles.passButton}><Text style={styles.passButtonGlyph}>✕</Text></Pressable><Text style={styles.swipeButtonCaption}>PASS</Text><Pressable accessibilityLabel="Like this profile" disabled={swipeBusy} onPress={() => void handleSwipe('LIKE')} style={styles.likeButton}><Text style={styles.likeButtonGlyph}>✓</Text></Pressable></View> : null}
        <View style={styles.safetyNote}><Text style={styles.safetyGlyph}>✦</Text><Text style={styles.safetyText}>A match opens a short 8-message intro. Swap contact details and meet on campus.</Text></View>
      </> : <>
        <View style={styles.goodsHead}><View><Text style={styles.eyebrow}>STUDENT-TO-STUDENT</Text><Text style={styles.sectionTitle}>Good finds nearby</Text></View><Pressable onPress={() => { resetListing(); setListModalOpen(true); }} style={styles.postButton}><Text style={styles.postButtonText}>＋ Post a good</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
        <View style={styles.goodsGrid}>{filteredGoods.map((item) => <GoodCard key={item.id} listing={item} seller={sellerFor(snapshot, item.sellerId)} />)}</View>
        {!filteredGoods.length ? <View style={styles.doneCard}><Text style={styles.doneTitle}>No goods in this category yet.</Text><Text style={styles.muted}>Post a useful item to start the exchange.</Text></View> : null}
        <Text style={styles.marketNote}>Listings use a local hackathon demo dataset. Ask the seller about condition and arrange a safe campus meetup.</Text>
      </>}
    </ScrollView>

    <Modal visible={matchesOpen} transparent animationType="slide" onRequestClose={() => setMatchesOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setMatchesOpen(false)}><View style={styles.sheet}>
        <View style={styles.sheetHead}><View><Text style={styles.eyebrow}>MUTUAL LIKES ONLY</Text><Text style={styles.sheetTitle}>Your skill matches</Text></View><Pressable onPress={() => setMatchesOpen(false)}><Text style={styles.close}>×</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.matchList}>{activeMatches.length ? activeMatches.map((match) => { const otherId = match.userAId === DEMO_TRADE_USER_ID ? match.userBId : match.userAId; const other = sellerFor(snapshot, otherId); if (!other) return null; return <Pressable key={match.id} onPress={() => void openChat(match)} style={styles.matchRow}><View style={styles.matchAvatar}><Text style={styles.matchAvatarText}>{other.name.trim().charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.matchName}>{other.name}</Text><Text style={styles.matchMeta}>{other.department} · {match.messageCount}/{match.maxMessages} messages used</Text></View><Text style={styles.matchArrow}>›</Text></Pressable>; }) : <View style={styles.doneCard}><Text style={styles.doneIcon}>✓</Text><Text style={styles.doneTitle}>No mutual matches yet</Text><Text style={styles.muted}>When someone you liked likes you back, they’ll appear here.</Text></View>}</ScrollView>
      </View></Pressable>
    </Modal>

    <Modal visible={!!newMatch} transparent animationType="fade" onRequestClose={() => setNewMatch(null)}>
      <View style={styles.matchBackdrop}><View style={styles.matchCelebration}><Text style={styles.confetti}>✦</Text><Text style={styles.matchEyebrow}>A MUTUAL SKILL SWAP</Text><Text style={styles.matchTitle}>It’s a Skill Match! 🎉</Text><Text style={styles.matchCopy}>You both want to share what you know. Start with a short intro and make a plan on campus.</Text><Pressable onPress={() => newMatch && void openChat(newMatch)} style={styles.primaryButton}><Text style={styles.primaryText}>Message your match</Text></Pressable><Pressable onPress={() => setNewMatch(null)} style={styles.textButton}><Text style={styles.textButtonText}>Keep browsing</Text></Pressable></View></View>
    </Modal>

    <Modal visible={!!visibleMatch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveMatch(null)}>
      {visibleMatch ? <SafeAreaProvider><SafeAreaView style={styles.chatSafe} edges={['top', 'bottom']}><KeyboardAvoidingView style={styles.chatScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {(() => { const otherId = visibleMatch.userAId === DEMO_TRADE_USER_ID ? visibleMatch.userBId : visibleMatch.userAId; const other = sellerFor(snapshot, otherId); const remaining = Math.max(0, visibleMatch.maxMessages - visibleMatch.messageCount); return <>
          <View style={styles.chatHeader}><View><Text style={styles.eyebrow}>SKILL MATCH · {other?.department || 'MSRIT'}</Text><Text style={styles.chatName}>{other?.name || 'Student'}</Text></View><Pressable onPress={() => setActiveMatch(null)}><Text style={styles.close}>×</Text></Pressable></View>
          <View style={styles.progressPill}><Text style={styles.progressText}>💬 {remaining} / {visibleMatch.maxMessages} Messages Remaining</Text></View>
          {remaining === 0 ? <Pressable onPress={() => void copyContact()} style={styles.limitBanner}><Text style={styles.limitTitle}>🔒 Message limit reached!</Text><Text style={styles.limitCopy}>Tap to copy {other?.name.split(' ')[0]}’s WhatsApp/Phone contact and meet in person on campus.</Text></Pressable> : null}
          <ScrollView contentContainerStyle={styles.chatMessages}>
            {chatLoading && !chatMessages.length ? <View style={styles.icebreakerLoading}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Preparing your Gemma icebreaker…</Text></View> : null}
            {chatMessages.map((message) => <View key={message.id} style={[styles.messageBubble, message.senderId === DEMO_TRADE_USER_ID ? styles.mineBubble : styles.theirBubble, message.isAiIcebreaker && styles.aiBubble]}><Text style={[styles.messageText, message.senderId === DEMO_TRADE_USER_ID && styles.mineText]}>{message.text}</Text>{message.isAiIcebreaker ? <Text style={styles.aiByline}>Gemma 4 · icebreaker</Text> : null}</View>)}
            {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
          </ScrollView>
          {remaining > 0 ? <View style={styles.chatComposer}><TextInput value={chatDraft} onChangeText={setChatDraft} placeholder="Keep it friendly and make a plan…" placeholderTextColor={C.muted} style={styles.chatInput} maxLength={280} multiline /><Pressable onPress={() => void sendMessage()} disabled={!chatDraft.trim() || chatLoading} style={[styles.sendButton, (!chatDraft.trim() || chatLoading) && styles.disabled]}><Text style={styles.sendButtonText}>Send</Text></Pressable></View> : null}
          <Text style={styles.chatFootnote}>Short intro only. Meet in a public place on campus and look out for each other.</Text>
        </>; })()}
      </KeyboardAvoidingView></SafeAreaView></SafeAreaProvider> : null}
    </Modal>

    <Modal visible={listModalOpen} transparent animationType="slide" onRequestClose={() => setListModalOpen(false)}>
      <KeyboardAvoidingView style={styles.formBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.formSheet}>
        <View style={styles.sheetHead}><View><Text style={styles.eyebrow}>GOODS MARKET</Text><Text style={styles.sheetTitle}>Post a new good</Text></View><Pressable onPress={() => setListModalOpen(false)}><Text style={styles.close}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
          <Pressable onPress={() => void chooseGoodPhoto()} style={styles.photoPick}>{pickedPhoto ? <Image source={{ uri: pickedPhoto }} style={styles.photoPicked} /> : <><Text style={styles.photoIcon}>↑</Text><Text style={styles.photoLabel}>Add item photo</Text><Text style={styles.photoSub}>Gemma 4 reviews campus suitability</Text></>}</Pressable>
          {reviewing ? <View style={styles.reviewState}><ActivityIndicator color={C.green} /><Text style={styles.reviewText}>Checking the item photo…</Text></View> : review ? <View style={[styles.reviewState, review.approved ? styles.approvedState : styles.rejectedState]}><Text style={styles.reviewText}>{review.approved ? '✓' : '×'}  {review.reason}</Text><Text style={styles.aiByline}>{review.source} photo review</Text></View> : null}
          <Text style={styles.fieldLabel}>ITEM TITLE</Text><TextInput value={listingTitle} onChangeText={setListingTitle} placeholder="e.g. Scientific calculator" placeholderTextColor={C.muted} style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>CATEGORY</Text><View style={styles.formCategories}>{CATEGORIES.map((item) => <Pressable key={item} onPress={() => setListingCategory(item)} style={[styles.formCategory, listingCategory === item && styles.formCategoryActive]}><Text style={[styles.formCategoryText, listingCategory === item && styles.formCategoryTextActive]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>RETAIL MRP (₹)</Text><TextInput value={mrp} onChangeText={setMrp} keyboardType="numeric" placeholder="1200" placeholderTextColor={C.muted} style={styles.fieldInput} />
          {Number(mrp) > 0 ? <View style={styles.priceBenchmark}><Text style={styles.priceBenchmarkTitle}>Suggested Campus Price: {formatPrice(suggestedPrice)}</Text><Text style={styles.priceBenchmarkMeta}>Retail MRP: {formatPrice(Number(mrp))} · suggested at about 40% of MRP</Text></View> : null}
          <Text style={styles.fieldLabel}>YOUR ASKING PRICE (₹)</Text><TextInput value={askingPrice} onChangeText={setAskingPrice} keyboardType="numeric" placeholder={suggestedPrice ? `${suggestedPrice}` : '450'} placeholderTextColor={C.muted} style={styles.fieldInput} />
          <Pressable onPress={() => void autoDescription()} disabled={writingDescription} style={[styles.aiDescriptionButton, writingDescription && styles.disabled]}>{writingDescription ? <ActivityIndicator color={C.green} /> : <Text style={styles.aiDescriptionText}>✨ Auto-Generate Description with Gemma 4</Text>}</Pressable>
          <TextInput value={listingDescription} onChangeText={setListingDescription} placeholder="Describe condition, useful details, and campus pickup…" placeholderTextColor={C.muted} style={[styles.fieldInput, styles.descriptionInput]} multiline />
          {aiSource ? <Text style={styles.aiByline}>Description draft · {aiSource}</Text> : null}
          <Pressable onPress={() => void submitGood()} disabled={savingListing || !review?.approved} style={[styles.primaryButton, (savingListing || !review?.approved) && styles.disabled]}><Text style={styles.primaryText}>{savingListing ? 'Posting…' : 'Post good'}</Text></Pressable>
        </ScrollView>
      </View></KeyboardAvoidingView>
    </Modal>
  </View>;
}

function GoodCard({ listing, seller }: { listing: GoodsListing; seller: UserProfile | undefined }) {
  return <View style={styles.goodCard}>
    <Image source={{ uri: listing.imageUrl }} style={styles.goodImage} resizeMode="cover" />
    <View style={styles.goodBody}><Text style={styles.goodCategory}>{listing.category.toUpperCase()}</Text><Text numberOfLines={2} style={styles.goodTitle}>{listing.title}</Text><Text style={styles.goodPrice}>{formatPrice(listing.askingPrice)} <Text style={styles.goodMrp}>MRP {formatPrice(listing.suggestedMrp)}</Text></Text><Text numberOfLines={1} style={styles.sellerDepartment}>{seller?.department || 'MSRIT student'}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper }, page: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 }, loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.paper }, muted: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  heading: { marginBottom: 17 }, eyebrow: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 5 }, title: { color: C.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 }, subtitle: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  sectionSwitch: { flexDirection: 'row', backgroundColor: '#E9EDE6', padding: 4, borderRadius: 15, marginBottom: 20 }, switchItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 }, switchActive: { backgroundColor: C.green }, switchText: { color: C.muted, fontSize: 10, fontWeight: '800' }, switchTextActive: { color: C.white },
  skillsTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '900' }, matchesButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.pale, borderRadius: 12 }, matchesGlyph: { color: '#000000', fontSize: 15, fontWeight: '900' }, matchesButtonText: { color: C.green, fontSize: 9, fontWeight: '900' },
  deckArea: { minHeight: 290, justifyContent: 'center', paddingBottom: 7 }, cardShadow: { position: 'absolute', top: 10, left: 12, right: 12, height: 250, borderRadius: 22, backgroundColor: '#DCE5DC', transform: [{ rotate: '2deg' }] }, skillCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingVertical: 13, paddingBottom: 14, elevation: 3, shadowColor: '#102118', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, previouslyViewed: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginHorizontal: 14, marginBottom: 8 }, profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingBottom: 2 }, smallAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pale, borderWidth: 1, borderColor: C.line }, smallAvatarText: { color: C.green, fontSize: 14, fontWeight: '900' }, profileName: { color: C.ink, fontSize: 16, fontWeight: '900' }, matchAvatarText: { color: C.green, fontSize: 15, fontWeight: '900' }, skillLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginTop: 13, marginHorizontal: 14, marginBottom: 6 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14 }, offerTag: { color: C.green, fontSize: 9, fontWeight: '800', backgroundColor: C.pale, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 }, needTag: { color: '#74442D', fontSize: 9, fontWeight: '800', backgroundColor: '#F8EDE6', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 }, bio: { color: '#56645C', fontSize: 10, lineHeight: 15, marginHorizontal: 14, marginTop: 12 }, swipeHint: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 14, marginTop: 11 }, passHint: { color: '#000000', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, dragHint: { color: '#9BA39C', fontSize: 8, fontWeight: '700' }, likeHint: { color: '#000000', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  swipeButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: -1, marginBottom: 14 }, passButton: { height: 49, width: 49, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: '#F0D3C7' }, passButtonGlyph: { color: '#000000', fontSize: 25, lineHeight: 30, fontWeight: '800' }, likeButton: { height: 55, width: 55, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, elevation: 2 }, likeButtonGlyph: { color: '#000000', fontSize: 24, fontWeight: '900' }, swipeButtonCaption: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 }, safetyNote: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.pale, borderRadius: 15, padding: 12 }, safetyGlyph: { color: C.green, fontSize: 17 }, safetyText: { flex: 1, color: C.muted, fontSize: 9, lineHeight: 14 }, doneCard: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: C.pale, borderRadius: 20, gap: 7 }, doneIcon: { color: '#000000', fontSize: 23, fontWeight: '900' }, doneTitle: { color: C.ink, fontSize: 15, fontWeight: '900', textAlign: 'center' }, resetDeck: { backgroundColor: C.green, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 }, resetDeckText: { color: C.white, fontSize: 9, fontWeight: '900' },
  goodsHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }, postButton: { backgroundColor: C.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }, postButtonText: { color: C.white, fontSize: 9, fontWeight: '900' }, filters: { gap: 7, paddingBottom: 14 }, filter: { borderWidth: 1, borderColor: C.line, backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 }, filterActive: { backgroundColor: C.green, borderColor: C.green }, filterText: { color: C.muted, fontSize: 8, fontWeight: '800' }, filterTextActive: { color: C.white }, goodsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 }, goodCard: { width: '48.5%', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' }, goodImage: { width: '100%', height: 122, backgroundColor: C.pale }, goodBody: { padding: 10 }, goodCategory: { color: C.green, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5 }, goodTitle: { color: C.ink, fontSize: 11, fontWeight: '900', minHeight: 30, lineHeight: 15 }, goodPrice: { color: C.green, fontSize: 12, fontWeight: '900', marginTop: 7 }, goodMrp: { color: C.muted, fontSize: 8, fontWeight: '600', textDecorationLine: 'line-through' }, sellerDepartment: { color: C.muted, fontSize: 8, marginTop: 5 }, marketNote: { color: C.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 16, paddingHorizontal: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,28,21,0.38)' }, sheet: { maxHeight: '88%', backgroundColor: C.paper, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingTop: 21, paddingHorizontal: 19, paddingBottom: 42 }, sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }, sheetTitle: { color: C.ink, fontSize: 21, fontWeight: '900' }, close: { color: C.ink, fontSize: 30, fontWeight: '400', paddingHorizontal: 4 }, matchList: { gap: 9, paddingBottom: 4 }, matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 11 }, matchAvatar: { height: 36, width: 36, borderRadius: 12, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, matchName: { color: C.ink, fontSize: 12, fontWeight: '900' }, matchMeta: { color: C.muted, fontSize: 8, marginTop: 4 }, matchArrow: { color: C.green, fontSize: 24, paddingHorizontal: 5 },
  matchBackdrop: { flex: 1, backgroundColor: 'rgba(16,28,21,0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, matchCelebration: { width: '100%', backgroundColor: C.paper, borderRadius: 24, padding: 23, alignItems: 'center' }, confetti: { color: C.orange, fontSize: 31, marginBottom: 8 }, matchEyebrow: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 }, matchTitle: { color: C.ink, fontSize: 22, fontWeight: '900', textAlign: 'center' }, matchCopy: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 9, marginBottom: 18 }, primaryButton: { width: '100%', minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green, marginTop: 13 }, primaryText: { color: C.white, fontSize: 11, fontWeight: '900' }, textButton: { paddingVertical: 13 }, textButtonText: { color: C.green, fontSize: 10, fontWeight: '800' },
  chatSafe: { flex: 1, backgroundColor: C.paper }, chatScreen: { flex: 1, backgroundColor: C.paper, paddingTop: 8, paddingBottom: 8 }, chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line }, chatName: { color: C.ink, fontSize: 18, fontWeight: '900' }, progressPill: { alignSelf: 'center', backgroundColor: C.pale, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginTop: 13 }, progressText: { color: C.green, fontSize: 9, fontWeight: '900' }, limitBanner: { backgroundColor: '#F8EDE6', marginHorizontal: 15, marginTop: 11, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#F0D4C8' }, limitTitle: { color: C.danger, fontSize: 11, fontWeight: '900', marginBottom: 4 }, limitCopy: { color: '#71483D', fontSize: 9, lineHeight: 14 }, chatMessages: { flexGrow: 1, paddingHorizontal: 15, paddingVertical: 15, gap: 9, justifyContent: 'flex-end' }, icebreakerLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 }, messageBubble: { maxWidth: '88%', flexShrink: 1, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 15, overflow: 'visible' }, mineBubble: { alignSelf: 'flex-end', backgroundColor: C.green, borderBottomRightRadius: 5 }, theirBubble: { alignSelf: 'flex-start', backgroundColor: C.white, borderBottomLeftRadius: 5 }, aiBubble: { alignSelf: 'flex-start', backgroundColor: C.pale, borderBottomLeftRadius: 5 }, messageText: { color: C.ink, fontSize: 12, lineHeight: 18, flexShrink: 1, includeFontPadding: false }, mineText: { color: C.white }, aiByline: { color: C.muted, fontSize: 7, fontWeight: '800', marginTop: 6 }, chatError: { color: C.danger, backgroundColor: '#F8EDE6', padding: 10, borderRadius: 10, fontSize: 9 }, chatComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.line }, chatInput: { flex: 1, minHeight: 43, maxHeight: 100, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 11, color: C.ink, fontSize: 11, lineHeight: 17, textAlignVertical: 'top', includeFontPadding: false }, sendButton: { minWidth: 57, minHeight: 42, paddingHorizontal: 13, borderRadius: 13, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, sendButtonText: { color: C.white, fontSize: 10, fontWeight: '900' }, chatFootnote: { color: C.muted, fontSize: 7, textAlign: 'center', marginTop: 8, paddingHorizontal: 14 },
  formBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,28,21,0.38)' }, formSheet: { height: '90%', backgroundColor: C.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 21, paddingHorizontal: 19, paddingBottom: 44 }, formContent: { paddingBottom: 24 }, photoPick: { height: 148, borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, photoPicked: { height: '100%', width: '100%' }, photoIcon: { color: C.green, fontSize: 28, marginBottom: 3 }, photoLabel: { color: C.ink, fontSize: 12, fontWeight: '900' }, photoSub: { color: C.muted, fontSize: 8, marginTop: 4 }, reviewState: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: C.pale, marginBottom: 10 }, approvedState: { backgroundColor: C.pale }, rejectedState: { backgroundColor: '#F8EDE6' }, reviewText: { color: C.green, fontSize: 9, lineHeight: 14, flex: 1 }, fieldLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 9, marginBottom: 5 }, fieldInput: { minHeight: 42, borderRadius: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, paddingHorizontal: 11, paddingVertical: 9, color: C.ink, fontSize: 10 }, formCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, formCategory: { borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: C.line }, formCategoryActive: { backgroundColor: C.green, borderColor: C.green }, formCategoryText: { color: C.muted, fontSize: 8, fontWeight: '800' }, formCategoryTextActive: { color: C.white }, priceBenchmark: { backgroundColor: C.pale, borderRadius: 12, padding: 10, marginTop: 9 }, priceBenchmarkTitle: { color: C.green, fontSize: 10, fontWeight: '900' }, priceBenchmarkMeta: { color: C.muted, fontSize: 8, marginTop: 4 }, aiDescriptionButton: { alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 12, backgroundColor: C.lime, marginTop: 11 }, aiDescriptionText: { color: C.green, fontSize: 9, fontWeight: '900' }, descriptionInput: { minHeight: 74, textAlignVertical: 'top', marginTop: 8 }, disabled: { opacity: 0.5 },
});
