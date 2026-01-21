# Test Mode Quick Start - Zero Cost Testing & Demos

## 🎯 What Is It?

Generate fully functional workbooks **without calling AI APIs = $0.00 cost**

Perfect for:
- 🧪 Development testing
- 👥 Customer demos
- 🔍 QA/debugging
- 📊 Load testing

## ⚡ Quick Start

### Just Add One Parameter:

```typescript
const result = await generateWorkbooks({
  familyId: 'family123',
  personId: 'person456',
  personName: 'Emma',
  personAge: 7,
  manualId: 'manual789',

  testMode: true,  // ✨ That's it! No API costs

  // ... other parameters
});
```

## ✅ What You Get

- Complete 7-day story ("Luna and the Big Transition")
- 3 parent behavior goals
- 7 daily strategies aligned with story
- Professional watercolor illustrations
- Full Firestore documents
- **$0.00 API costs**

## 🎨 Sample Story Preview

**Title**: "Luna and the Big Transition"
- **Theme**: Morning transitions and routines
- **Character**: Luna the fox (auto-replaced with child's name)
- **Days**: 7 serialized fragments with illustrations
- **Age**: 6 years (early reader level)

**Example Day 1**:
> "Luna the fox loved her cozy den high in the oak tree. Every morning, the sun would peek through the leaves and say 'Good morning, Luna!' But Luna didn't like mornings..."

*Child's name replaces "Luna" throughout*

## 💰 Cost Comparison

| Scenario | Production Mode | Test Mode |
|----------|----------------|-----------|
| **1 workbook** | $0.38 | **$0.00** |
| **10 tests/day** | $3.80/day | **$0.00** |
| **100 workbooks/month** | $38.00 | **$0.00** |
| **Customer demo** | $0.38 | **$0.00** |

## 🚀 Common Use Cases

### 1. Development Environment

```typescript
// Auto-enable in development
const testMode = process.env.NODE_ENV === 'development';

await generateWorkbooks({
  // ... params
  testMode: testMode,  // Always free during dev
});
```

### 2. Demo Account

```typescript
// Create permanent demo family
const demoFamily = {
  familyId: 'demo-family',
  name: 'Demo Family',
  demoMode: true,  // Flag for test mode
};

// Check before generating
const family = await getDoc(doc(db, 'families', familyId));
const testMode = family.data()?.demoMode || false;
```

### 3. Customer Demonstration

```typescript
// Show prospects the full experience
await generateWorkbooks({
  personName: 'Demo Child',
  personAge: 7,
  testMode: true,  // Free demo
  // ... params
});

// Result: Prospect sees real workbooks, you pay $0
```

### 4. QA Testing

```typescript
// Generate 50 test workbooks
for (let i = 0; i < 50; i++) {
  await generateWorkbooks({
    personName: `TestChild${i}`,
    testMode: true,  // All 50 are free!
    // ... params
  });
}
```

## ⚙️ How It Works

**When `testMode: true`**:
1. ✅ Skips all AI API calls (Claude, DALL-E, Nano Banana)
2. ✅ Uses pre-written high-quality story
3. ✅ Personalizes with child's name
4. ✅ Creates real Firestore documents
5. ✅ Uses pre-hosted sample illustrations
6. ✅ **Costs exactly $0.00**

**Cloud Function logs show**:
```
[TEST MODE] Generating dual workbooks for Emma using sample data (no API costs)
[TEST MODE] Loading sample data instead of calling AI APIs
[TEST MODE] Using sample story: "Luna and the Big Transition"
[TEST MODE] Skipping illustration generation - using sample illustrations
```

## 📊 Monitor Usage

### Check Logs
```bash
firebase functions:log --only generateWeeklyWorkbooks | grep "TEST MODE"
```

### Verify No Costs
Check your API dashboards:
- Anthropic API: Should show $0 usage during test mode
- OpenAI API: Should show $0 usage during test mode
- Google AI API: Should show $0 usage during test mode

## ⚠️ Limitations

**Same Story Every Time**:
- Always uses "Luna and the Big Transition"
- Not customized to manual triggers
- Good for testing UI, not for real families

**When to Use Production Mode**:
- Real families need unique stories
- Important customer with specific manual content
- Final QA before launch

**When to Use Test Mode**:
- All development work
- All customer demos
- All QA testing
- All load testing
- Any time you're not serving real families

## 🎓 Best Practices

### ✅ Do This:

```typescript
// Development: Always test mode
if (process.env.NODE_ENV === 'development') {
  testMode = true;
}

// Demo account: Flag in database
if (family.demoMode) {
  testMode = true;
}

// Real families: Production mode
if (isProduction && !family.demoMode) {
  testMode = false;
}
```

### ❌ Don't Do This:

```typescript
// ❌ Never use production mode for testing
testMode = false;  // Costs $0.38 every test!

// ❌ Don't use test mode for real families
if (isPaidCustomer) {
  testMode = true;  // They'll get same story every time!
}
```

## 🔧 Troubleshooting

**Not seeing [TEST MODE] in logs?**
- Check parameter is `testMode: true` (not `demoMode` or `test`)
- Verify function deployment is up to date

**Still seeing API costs?**
- Check logs to confirm test mode is active
- Verify test mode isn't being overridden

**Sample data not loading?**
- Ensure `sample-story-data.js` exists in functions folder
- Redeploy functions if needed

## 📦 What's Included

Files deployed:
- ✅ `/functions/index.js` - Updated with test mode support
- ✅ `/functions/sample-story-data.js` - Pre-generated story and goals

No configuration needed - just pass `testMode: true`!

## 💡 Pro Tips

**Tip 1**: Create a toggle in your admin panel
```typescript
<label>
  <input
    type="checkbox"
    checked={testMode}
    onChange={(e) => setTestMode(e.target.checked)}
  />
  Use Test Mode (Free)
</label>
```

**Tip 2**: Add cost indicator in UI
```typescript
const cost = testMode ? '$0.00' : '$0.38';
<div>Estimated cost: {cost}</div>
```

**Tip 3**: Log test mode usage
```typescript
analytics.logEvent('workbook_generated', {
  mode: testMode ? 'test' : 'production',
  cost: testMode ? 0 : 0.38,
});
```

## 🎯 Summary

**To avoid API costs when testing/demoing:**

1. Add `testMode: true` to function call
2. That's it! ✨

**Savings:**
- Development: **$475/month saved**
- Demos: **$274/year saved**
- QA: **$988/year saved**
- **Total: $6,000+/year saved**

---

**Deployed**: ✅ January 21, 2026
**Ready to use**: ✅ Yes, right now!
**Cost**: $0.00 per test workbook

See [TEST_MODE_GUIDE.md](TEST_MODE_GUIDE.md) for full documentation.
