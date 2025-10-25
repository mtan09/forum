export type SummaryType = {
  id: string;
  name: string;
  summaryContent: string;
  info: {
    keywords: string[];
    volume: number;
  };
  position: number;
  images: string[];
  news: {
    left: NewsItem;
    center: NewsItem;
    right: NewsItem;
  };
  representatives: {
    publicVoices: PublicVoice[];
  };
  relatedTopics: string[];
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
};

type PublicVoice = {
  name: string;
  quote: string;
};


const mockSummaries: Record<string, SummaryType> = {
  "event-no-kings-protests-us-oct2025": {
    id: "event-no-kings-protests-us-oct2025",
    name: "“No Kings” Protests Against Trump (October 2025)",
    summaryContent: "On October 18, 2025, millions of Americans participated in the “No Kings” protests in over 2,600 locations nationwide, organized by a coalition of progressive groups to oppose perceived authoritarian overreach by President Donald Trump’s administration — including the deployment of federal forces in U.S. cities, immigration enforcement tactics, and concerns about democratic norms.",
    info: {
      keywords: ["No Kings protests", "Trump authoritarianism", "federal forces cities", "immigration enforcement", "democracy defence"],
      volume: 32452,
    },
    position: 0.40, // public sentiment: somewhat skeptical of Trump / somewhat supportive of protest movement
    images: [
      "https://npr.brightspotcdn.com/dims3/default/strip/false/crop/6758x4505+0+0/resize/1100/quality/50/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Fac%2F7e%2F719a240a4291b359f8363e623eef%2Fgettyimages-2241479997.jpg",
      "https://www.aljazeera.com/wp-content/uploads/2025/10/2025-10-18T154832Z_1631941537_RC2FEHALM1AL_RTRMADP_3_USA-TRUMP-PROTESTS-1760804735.jpg",
      "https://npr.brightspotcdn.com/dims3/default/strip/false/crop/6000x4000+0+0/resize/1100/quality/50/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Fad%2F3a%2F36701b934413af6465435fa120d6%2Fgettyimages-2241452691.jpg",
      "https://cloudfront-us-east-1.images.arcpublishing.com/opb/DKQYSSYBBJMB3DOMW7ALCBBSVI.jpg"
    ],
    news: {
      left: {
        title: "Trump’s response to ‘No Kings’ marches only proved the protesters’ point",
        url: "https://www.cnn.com/2025/10/20/politics/trump-no-kings-protests-vance-cia-analysis",
        source: "CNN"
      },
      center: {
        title: "‘No Kings’ rallies draw large crowds in US cities to decry Trump",
        url: "https://www.reuters.com/world/us/no-kings-rallies-expected-draw-millions-across-us-protest-against-trump-2025-10-18/",
        source: "Reuters"
      },
      right: {
        title: "'NYU Communists' vow to fight capitalism with Marxist revolution at 'No Kings' rally",
        url: "https://www.foxnews.com/us/nyu-communists-vow-fight-capitalism-marxist-revolution-no-kings-rally",
        source: "Fox News"
      }
    },
    representatives: {
      publicVoices: [
        { name: "John Smith (Reddit)", quote: "It’s time we help Ukraine get the tools to end this – waiting weakens the West." },
        { name: "Maria Lopez (Twitter)", quote: "Devastating to see civilian rail hubs bombed. Peace must include justice." },
        { name: "David Nguyen (Facebook)", quote: "I support Ukraine, but worried this drags the US into a bigger war." }
      ]
    },
    relatedTopics: ["executive power", "free speech & protest rights", "militarisation of domestic policing"]
  },
  
  "event-voting-rights-act-scotus-2025": {
    id: "event-voting-rights-act-scotus-2025",
    name: "Supreme Court Reviews Voting Rights Act of 1965 Section 2 Case (October 2025)",
    summaryContent: "The Supreme Court of the United States heard arguments in a significant case (Louisiana v. Callais) challenging Section 2 of the Voting Rights Act, which prohibits electoral maps that dilute minority voting power. The Court’s conservative majority appeared inclined to significantly weaken the provision, which civil-rights groups warn could reshape U.S. democracy and partisanship. :contentReference[oaicite:5]{index=5}",
    info: {
      keywords: ["Voting Rights Act", "Section 2", "racial gerrymandering", "Supreme Court", "Louisiana v Callais"],
      volume: 0.80
    },
    position: 0.30, // public sentiment: moderate-negative (concerned about weakening protections)
    images: [
      "https://example.com/images/supreme-court-voting-rights-2025.jpg",
      "https://example.com/images/louisiana-v-callais-courtroom-2025.jpg",
      "https://example.com/images/voting-rights-act-march-2025.jpg"
    ],
    news: {
      left: {
        title: "Voting Rights Act on the line: key takeaways from supreme court hearing",
        url: "https://www.theguardian.com/us-news/2025/oct/15/voting-rights-act-supreme-court-case",
        source: "The Guardian"
      },
      center: {
        title: "Conservative justices seem poised to weaken Voting Rights Act",
        url: "https://www.politico.com/news/2025/10/15/supreme-court-voting-rights-act-argument-00609187",
        source: "Politico"
      },
      right: {
        title: "Court may strike down race-based redistricting: equal protection vs. Voting Rights Act",
        url: "https://nypost.com/2025/10/16/us-news/court-may-strike-down-race-based-redistricting",
        source: "New York Post"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Aisha Roberts (Twitter)", quote: "If Section 2 goes, minority voters will be silenced in far too many states." },
        { name: "Eric Wang (Reddit)", quote: "Looks like the court is preparing a partisan power grab dressed as law." },
        { name: "Linda Gonzalez (Facebook)", quote: "Fair maps matter — this is about representing everyone, not just one side." }
      ]
    },
    relatedTopics: ["gerrymandering", "racial justice & voting rights", "judicial power & precedent"]
  },
  
  "event-governors-public-health-alliance-2025": {
    id: "event-governors-public-health-alliance-2025",
    name: "U.S. Governors Launch Public Health Alliance (October 2025)",
    summaryContent: "On October 15, 2025, a bipartisan (though mostly Democratic) coalition of 15 U.S. governors launched the Governors Public Health Alliance to strengthen public health coordination, data-sharing and emergency preparedness across states, apparently in response to perceived federal neglect under the Trump administration. :contentReference[oaicite:7]{index=7}",
    info: {
      keywords: ["Governors Public Health Alliance", "state collaboration public health", "emergency preparedness states", "federal health policy divide"],
      volume: 0.60
    },
    position: 0.55, // public sentiment: somewhat positive towards collaboration
    images: [
      "https://example.com/images/governors-public-health-alliance-2025.jpg",
      "https://example.com/images/state-governors-launch-alliance-2025.jpg",
      "https://example.com/images/public-health-coordination-states-2025.jpg"
    ],
    news: {
      left: {
        title: "Democratic governors form a public health alliance in rebuke of Trump administration",
        url: "https://apnews.com/article/7d5f277178697bbdfc228567c6d9f616",
        source: "AP News"
      },
      center: {
        title: "US governors launch alliance to bolster coordination on public health",
        url: "https://www.reuters.com/world/us/colorado-joins-new-governors-alliance-strengthen-public-health-coordination-2025-10-15/",
        source: "Reuters"
      },
      right: {
        title: "Governors network hints at political motives behind public-health alliance",
        url: "https://www.nypost.com/2025/10/17/us-news/governors-public-health-alliance-politics/",
        source: "New York Post"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Carlos Mendez (X)", quote: "Finally states are stepping up where the feds failed us." },
        { name: "Sharon Kim (Instagram)", quote: "Good idea in principle — but will it get partisan fast?" },
        { name: "Tom Ellis (Facebook)", quote: "I hope this means real coordination and not just headlines." }
      ]
    },
    relatedTopics: ["state vs federal powers", "public health & governance", "emergency preparedness"]
  },
  
  "event-us-china-trade-framework-2025": {
    id: "event-us-china-trade-framework-2025",
    name: "US-Japan/US-China Trade Framework Developments (July 2025)",
    summaryContent: "In July 2025, the U.S. and Japan unveiled a new trade framework including reciprocal tariffs and major investment commitments, while the U.S. also continued trade pressure on China — signalling shifting global economic alignments and concerns about supply-chain security and manufacturing decoupling. :contentReference[oaicite:8]{index=8}",
    info: {
      keywords: ["US-Japan trade framework", "reciprocal tariffs Japan", "supply chain decoupling China", "manufacturing investment US", "global trade realignment"],
      volume: 0.70
    },
    position: 0.50, // public sentiment: neutral / divided
    images: [
      "https://example.com/images/us-japan-trade-deal-2025.jpg",
      "https://example.com/images/us-china-trade-tensions-2025.jpg",
      "https://example.com/images/manufacturing-investment-us-2025.jpg"
    ],
    news: {
      left: {
        title: "US and Japan announce new trade framework amidst global tensions",
        url: "https://www.accessiblelearning.in/america-in-focus-key-us-events-that-shaped-the-week-july-20–26-2025",
        source: "AccessibleLearning"
      },
      center: {
        title: "US and Japan unveil reciprocal tariffs and major investment pact",
        url: "https://www.accessiblelearning.in/america-in-focus-key-us-events-that-shaped-the-week-july-20–26-2025",
        source: "AccessibleLearning"
      },
      right: {
        title: "US ramps up trade pressure on China to protect American manufacturing",
        url: "https://www.guardianmagazine.com/2025/06/shocking-current-events-you-must-know-in-2025-now/",
        source: "The Guardian Magazine"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Priya Singh (LinkedIn)", quote: "Good to see investment coming back to US soil." },
        { name: "Jordan Reed (Twitter)", quote: "Tariffs hurt consumers — this might backfire." },
        { name: "Linda Ng (Reddit)", quote: "If supply chains diversify it’s welcome, but cost matters." }
      ]
    },
    relatedTopics: ["supply-chain security", "manufacturing policy", "US-China economic rivalry"]
  },
  
  "event-taiwan-strait-tensions-2025": {
    id: "event-taiwan-strait-tensions-2025",
    name: "Cross-Strait Tensions: Taiwan & China (October 2025)",
    summaryContent: "In October 2025, Taiwan’s main opposition party (the Kuomintang) elected a new leader who pledged closer cross-Strait cooperation, at a time when China's military and cyber activity near Taiwan increased. Reports show a 17 % rise in cyber-attacks and troll campaigns attributed to Beijing. The U.S. remains supportive of Taiwan’s defence, yet public opinion is cautious about direct confrontation. :contentReference[oaicite:10]{index=10}",
    info: {
      keywords: ["Taiwan KMT leadership", "China cyber-attacks Taiwan", "cross-Strait relations", "U.S. Indo-Pacific strategy", "military drills Taiwan 2025"],
      volume: 0.65
    },
    position: 0.58, // public sentiment: somewhat supportive of Taiwan but cautious
    images: [
      "https://example.com/images/taiwan-kmt-election-2025.jpg",
      "https://example.com/images/china-cyberattacks-taiwan-2025.jpg",
      "https://example.com/images/taiwan-strait-military-drills-2025.jpg"
    ],
    news: {
      left: {
        title: "Taiwan's main opposition party elects new leader in a race clouded by claims of China meddling",
        url: "https://apnews.com/article/ec700a517f43c35b372a7e049646d74b",
        source: "AP News"
      },
      center: {
        title: "Taiwan flags rise in Chinese cyberattacks, warns of 'online troll army'",
        url: "https://www.reuters.com/world/asia-pacific/taiwan-flags-rise-chinese-cyberattacks-warns-online-troll-army-2025-10-14/",
        source: "Reuters"
      },
      right: {
        title: "China's Xi calls for 'reunification' in message to new Taiwan opposition leader",
        url: "https://www.reuters.com/world/china/chinas-xi-calls-reunification-message-new-taiwan-opposition-leader-2025-10-19/",
        source: "Reuters"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Amy Chen (Instagram)", quote: "Taiwan must stand strong – but I’m uneasy about being a pawn in a super-power game." },
        { name: "Liam Brown (X)", quote: "If the US backs Taiwan, we risk war with China. Is it worth it?" },
        { name: "Wen Li (Taiwan forum)", quote: "Closer ties with China might bring stability – but at what cost for freedom?" }
      ]
    },
    relatedTopics: ["semiconductor supply chains", "U.S. Indo-Pacific strategy", "cyber warfare & misinformation"]
  },
  
  "event-military-parade-us-army-250th-2025": {
    id: "event-military-parade-us-army-250th-2025",
    name: "U.S. Army 250th Anniversary Parade & Domestic Militarisation Questions (June 2025)",
    summaryContent: "In June 2025, the United States Army celebrated its 250th anniversary with a large military parade in Washington D.C., featuring tanks and military hardware on the National Mall. The event sparked debate about domestic militarisation and the partisan use of the U.S. military. :contentReference[oaicite:12]{index=12}",
    info: {
      keywords: ["US Army 250th parade", "military on national mall", "domestic militarisation US", "military-political display Trump", "civil-military relations US 2025"],
      volume: 0.55
    },
    position: 0.45, // public sentiment: skeptical / uneasy
    images: [
      "https://example.com/images/us-army-250th-parade-2025.jpg",
      "https://example.com/images/us-army-tank-national-mall-2025.jpg",
      "https://example.com/images/us-army-troops-march-250th-2025.jpg"
    ],
    news: {
      left: {
        title: "Trump’s military parade is a warning",
        url: "https://www.vox.com/politics/416880/trumps-military-parade-is-a-warning",
        source: "Vox"
      },
      center: {
        title: "US Army 250th anniversary parade raises questions about militarisation of public space",
        url: "https://www.vox.com/politics/416880/trumps-military-parade-is-a-warning", // placeholder reuse
        source: "Vox"
      },
      right: {
        title: "Military tribute or political spectacle? Army 250th parade sparks debate",
        url: "https://www.nypost.com/2025/06/15/us-news/us-army-250th-parade-political-spectacle/",
        source: "New York Post"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Mark Davies (Facebook)", quote: "Proud of our troops — but mixing politics and the military makes me nervous." },
        { name: "Sophie Nguyen (Twitter)", quote: "Is this a parade or propaganda? Hard to tell." },
        { name: "Carlos Molina (Reddit)", quote: "When you see tanks in DC it raises red flags about civilian-military balance." }
      ]
    },
    relatedTopics: ["civil-military relations", "domestic use of armed forces", "political display of military power"]
  },
  
  "event-us-immigration-and-free-speech-2025": {
    id: "event-us-immigration-and-free-speech-2025",
    name: "US Flag-Burning Order & Immigration Actions (Aug 2025)",
    summaryContent: "In August 2025, President Trump signed an executive order seeking to criminalise flag burning—contradicting long-standing free-speech protections—and simultaneously stepped up immigration enforcement, including deployment of the National Guard in cities and ICE actions. The moves triggered debate over constitutional rights, federal power and civil liberties. :contentReference[oaicite:13]{index=13}",
    info: {
      keywords: ["flag burning criminalisation", "immigration enforcement US 2025", "federal forces cities", "civil liberties US 2025", "Trump executive orders civil rights"],
      volume: 0.72
    },
    position: 0.35, // public sentiment: negative towards these measures
    images: [
      "https://example.com/images/flag-burning-protest-2025.jpg",
      "https://example.com/images/national-guard-city-deployment-2025.jpg",
      "https://example.com/images/immigration-raid-2025.jpg"
    ],
    news: {
      left: {
        title: "Trump administration news at a glance: president takes on Supreme Court with order to criminalise flag burning",
        url: "https://www.theguardian.com/us-news/2025/aug/26/president-trump-administration-news-today-latest",
        source: "The Guardian"
      },
      center: {
        title: "Key U.S. News from April 13–19 2025: Politics, Economy, and Natural Disasters",
        url: "https://www.accessiblelearning.in/key-us-news-from-april-13-19-2025-politics-economy-and-natural-disasters",
        source: "AccessibleLearning"
      },
      right: {
        title: "Trump signs order cracking down on flag-burning and ramps immigration raids",
        url: "https://www.nypost.com/2025/08/27/us-news/trump-flag-burning-order-immigration-raids/",
        source: "New York Post"
      }
    },
    representatives: {
      publicVoices: [
        { name: "Olivia Grant (X)", quote: "Flag-burning should be allowed — it's a symbol of protest." },
        { name: "Michael Ford (Facebook)", quote: "This is about protecting the flag and national dignity." },
        { name: "Jasmine Patel (Reddit)", quote: "Worrisome how quickly civil liberties can be sidelined." }
      ]
    },
    relatedTopics: ["freedom of speech", "immigration policy", "federal vs state powers"]
  }
};

export const fetchMockSummary = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockSummaries[id];
}