export type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  topic?: string;
  framing?: string;
};

export const mockMessages: Message[] = [
  {
    id: '1',
    content: "Can you explain the current Israel-Palestine conflict?",
    sender: 'user',
    timestamp: new Date('2024-10-24T10:00:00'),
    topic: 'Gaza Ceasefire',
    framing: 'High School Student'
  },
  {
    id: '2',
    content: "Imagine you're learning about this in history class. The current conflict between Israel and Palestine escalated significantly on October 7, 2023, when Hamas, a Palestinian militant group, launched a surprise attack on Israel. This led to Israel declaring war and conducting military operations in Gaza.\n\nThe conflict has deep historical roots going back to the early 20th century, involving disputes over land, sovereignty, and security. Both sides have different perspectives on territory rights and peaceful coexistence.\n\nCurrently, there are major humanitarian concerns in Gaza, with many civilian casualties and limited access to basic necessities. The international community is calling for a ceasefire and peace negotiations.",
    sender: 'ai',
    timestamp: new Date('2024-10-24T10:00:05'),
    topic: 'Gaza Ceasefire',
    framing: 'High School Student'
  },
  {
    id: '3',
    content: "What's happening with Trump's legal cases?",
    sender: 'user',
    timestamp: new Date('2024-10-24T10:01:00'),
    topic: 'Trump Trials',
    framing: 'College Student'
  },
  {
    id: '4',
    content: "Let me explain this like a legal studies course. Former President Trump is currently facing multiple significant legal challenges:\n\n1. Georgia Election Case: Charged with attempting to overturn 2020 election results\n2. Federal Election Case: Similar charges at the federal level\n3. Classified Documents Case: Regarding handling of classified materials\n4. New York Civil Fraud Case: About business valuation practices\n\nThese cases are proceeding through different court systems - state and federal. Each has its own timeline and potential consequences. The cases are particularly significant as they involve a former president and current presidential candidate.",
    sender: 'ai',
    timestamp: new Date('2024-10-24T10:01:05'),
    topic: 'Trump Trials',
    framing: 'College Student'
  },
  {
    id: '5',
    content: "What's the economic impact of AI?",
    sender: 'user',
    timestamp: new Date('2024-10-24T10:02:00'),
    topic: 'AI Impact',
    framing: 'Professional'
  },
  {
    id: '6',
    content: "From a professional perspective, AI's economic impact is multifaceted:\n\n1. Labor Market Transformation:\n- Automation of routine tasks\n- Creation of new job categories\n- Skill requirement shifts\n\n2. Productivity Gains:\n- Streamlined operations\n- Reduced costs\n- Improved decision-making\n\n3. Market Dynamics:\n- New business models\n- Industry disruption\n- Competition reshaping\n\n4. Investment Landscape:\n- Increased VC funding\n- Stock market implications\n- R&D priorities\n\nThe net effect is a significant economic transformation, requiring adaptation but offering substantial growth opportunities.",
    sender: 'ai',
    timestamp: new Date('2024-10-24T10:02:05'),
    topic: 'AI Impact',
    framing: 'Professional'
  }
];