import { VoiceCharacter } from './types';

export const HINDI_VOICES: VoiceCharacter[] = [
  {
    id: 'aarav',
    name: 'Aarav',
    hindiName: 'आरव',
    gender: 'male',
    desc: 'Professional & Deep: Perfect for corporate presentations, announcements, and formal news reading.',
    prebuiltVoice: 'Charon', // Bold, deep male voice
  },
  {
    id: 'ananya',
    name: 'Ananya',
    hindiName: 'अनन्या',
    gender: 'female',
    desc: 'Warm & Helpful: Ideal for customer care, support desks, and step-by-step guidance.',
    prebuiltVoice: 'Kore', // Warm, clear female voice
  },
  {
    id: 'kabir',
    name: 'Kabir',
    hindiName: 'कबीर',
    gender: 'male',
    desc: 'Energetic & Confident: Tailored for marketing, podcasts, active tutorials, and ads.',
    prebuiltVoice: 'Fenrir', // Active energetic male voice
  },
  {
    id: 'kavya',
    name: 'Kavya',
    hindiName: 'काव्या',
    gender: 'female',
    desc: 'Expressive Storyteller: Elegant tone, designed for storytelling, poetry, literature, and educational content.',
    prebuiltVoice: 'Zephyr', // Sweet expressive female voice
  }
];

export const TTS_PRESETS = [
  {
    label: 'Customer Support (ग्राहक सहायता)',
    text: 'नमस्ते, वाणी एआई कस्टमर सपोर्ट में आपका स्वागत है। मैं अनन्या हूँ, आपकी डिजिटल सहायिका। मैं आज आपकी किस प्रकार सहायता कर सकती हूँ?',
    voiceId: 'ananya',
    emotion: 'Polite'
  },
  {
    label: 'News Reading (समाचार वाचन)',
    text: 'नमस्कार, मुख्य समाचारों के साथ मैं आरव। भारतीय अंतरिक्ष अनुसंधान संगठन ने आज सवेरे श्रीहरिकोटा से अपने नए मौसम उपग्रह का सफल प्रक्षेपण किया है।',
    voiceId: 'aarav',
    emotion: 'Formal'
  },
  {
    label: 'Storytelling (कहानी सुनाना)',
    text: 'एक बार की बात है, हिमालय की सुंदर वादियों में बसा एक छोटा सा गाँव था। वहाँ काव्या नाम की एक छोटी लड़की रहती थी जो पहाड़ों के अनसुने रहस्यों को जानने के लिए हमेशा उत्सुक रहती थी...',
    voiceId: 'kavya',
    emotion: 'Storyteller'
  },
  {
    label: 'Product Marketing (उत्पाद विपणन)',
    text: 'क्या आप अपनी खुद की हिंदी आवाज बनाना चाहते हैं? वाणी वॉइस एआई के साथ, अब आप मात्र कुछ सेकेंड्स में किसी भी पाठ को अत्यंत प्राकृतिक और स्पष्ट आवाज़ में बदल सकते हैं और सीधे MP3 में डाउनलोड कर सकते हैं!',
    voiceId: 'kabir',
    emotion: 'Energetic'
  }
];

export const TRANSLATION_PRESETS = [
  {
    english: "Welcome to Vani AI voice platform. Generating natural speech in Indian languages with instant audio preview and MP3 export.",
    hindi: "वाणी एआई वॉयस प्लेटफॉर्म में आपका स्वागत है। तत्काल ऑडियो पूर्वावलोकन और एमपी3 डाउनलोड के साथ भारतीय भाषाओं में प्राकृतिक आवाज़ बनाएं।"
  },
  {
    english: "Please make sure your microphone is enabled in browser permissions to record high-quality audio.",
    hindi: "कृपया सुनिश्चित करें कि उच्च गुणवत्ता वाले ऑडियो रिकॉर्ड करने के लिए आपके ब्राउज़र की अनुमतियों में आपका माइक्रोफ़ोन सक्षम है।"
  },
  {
    english: "Vani voice technology bridges the digital divide for millions of Hindi speakers across the country.",
    hindi: "वाणी वॉयस तकनीक देश भर में लाखों हिंदी भाषी लोगों के लिए डिजिटल दूरी को पाटने का काम करती है।"
  }
];
