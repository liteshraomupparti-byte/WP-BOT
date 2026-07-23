# Mummy's Shop WhatsApp Bot — Setup Guide (0 se)

## Kya banaya hai
- Customer "hi" bhejega → menu aayega (Sarees / Lehenga / Jewellery)
- Category select karega → uski images + price + caption aayenge
- Kuch bhi type karke poochega → ek fixed reply aayega ("team jaldi reply karegi, menu likhein")
- Sab kuch tera code hai, `catalog.json` edit karke naye products daal sakta hai (koi coding nahi chahiye iske liye)
- Ye poora bot **100% free** hai — koi AI/paid API use nahi hui

---

## STEP 1: Meta Developer Account banao (15 min)
1. https://developers.facebook.com par jao, apne Facebook account se login karo
2. "My Apps" → "Create App" → type select karo "Business"
3. App create hone ke baad, dashboard me "WhatsApp" product add karo (Add Product → WhatsApp → Set up)

## STEP 2: Test number se try karo (5 min)
1. WhatsApp > API Setup page par ek **test phone number** aur **temporary access token** milega (24hr valid, baad mein permanent banayenge)
2. "Phone number ID" copy karke `.env` file me `PHONE_NUMBER_ID` me daalo
3. Access token copy karke `WHATSAPP_TOKEN` me daalo
4. Usi page par "To" field me apna khud ka WhatsApp number add karo (test recipient) — verification code aayega

## STEP 3: Code chalao apne computer par (10 min)
```bash
cd mummy-shop-bot
npm install
cp .env.example .env
# .env file kholo aur tokens bharo (Step 2 se)
npm start
```
Server `http://localhost:3000` par chalega.

## STEP 4: Webhook connect karo (Meta ko tera server dikhna chahiye)
Meta ko public URL chahiye, localhost nahi chalega. Testing ke liye **ngrok** use karo:
```bash
npx ngrok http 3000
```
Ye ek public URL dega jaise `https://abc123.ngrok.io`

Meta Developer Console me:
1. WhatsApp > Configuration > Webhook > Edit
2. Callback URL: `https://abc123.ngrok.io/webhook`
3. Verify token: wahi jo `.env` me `VERIFY_TOKEN` likha hai (default: `mummyshop123`)
4. "Verify and Save" click karo
5. Webhook fields me "messages" ko subscribe karo

## STEP 5: Test karo
Apne test-registered number se bot ke WhatsApp number par "hi" bhejo → menu aana chahiye.

## STEP 6: Products/collections add karna
`catalog.json` file kholo, naya item add karo:
```json
{
  "name": "Naya Product",
  "price": "₹2,000",
  "image_url": "https://tumhari-image-ka-link.jpg",
  "caption": "Product ka description jo customer ko dikhega"
}
```
Image ka link chahiye — apni images kisi bhi jagah upload karo (Google Drive public link, Imgur, ya khud ki website) aur wahan ka direct link daalo.

## STEP 7: Live/production karna (real number, hamesha ke liye)
Test number sirf 5 registered numbers tak kaam karta hai. Real customers ke liye:
1. Apna khud ka business phone number Meta me verify karo (WhatsApp > API Setup > Add phone number)
2. "System User" bana kar **permanent access token** generate karo (temporary token 24hr me expire ho jata hai) — Business Settings > System Users
3. Code ko kisi free hosting par daalo taaki ye 24x7 chale (localhost/ngrok sirf testing ke liye hai):
   - **Render.com** (free tier) — GitHub se connect karke deploy ho jata hai
   - Deploy hone ke baad wahan ka URL webhook me daalo (Step 4 jaisa)

---

## Agar atak jao
- Webhook verify nahi ho raha → check karo VERIFY_TOKEN .env aur Meta console dono me same hai
- Message nahi aa raha → check karo "messages" field webhook me subscribe hai
- 24 ghante baad token expire ho gaya → temporary token dobara generate karo, ya Step 7 karke permanent bana lo
