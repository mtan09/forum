export const mockTopics = [
  { id: "event-no-kings-protests-us-oct2025", name: "“No Kings” Protests Against Trump (October 2025)" },
  { id: "event-voting-rights-act-scotus-2025", name: "Supreme Court Reviews Voting Rights Act of 1965 Section 2 Case (October 2025)" },
  { id: "event-governors-public-health-alliance-2025", name: "U.S. Governors Launch Public Health Alliance (October 2025)" },
  { id: "event-us-china-trade-framework-2025", name: "US-Japan/US-China Trade Framework Developments (July 2025)" },
  { id: "event-taiwan-strait-tensions-2025", name: "Cross-Strait Tensions: Taiwan & China (October 2025)" },
  { id: "event-military-parade-us-army-250th-2025", name: "U.S. Army 250th Anniversary Parade & Domestic Militarisation Questions (June 2025)" },
  { id: "event-us-immigration-and-free-speech-2025", name: "US Flag-Burning Order & Immigration Actions (Aug 2025)" },
];


export const fetchMockTopics = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockTopics;
}