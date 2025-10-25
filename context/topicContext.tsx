import { fetchMockTopics } from '@/data/mockTopics';
import { createContext, useContext, useEffect, useState } from 'react';

type TopicType = {
  id: string;
  name: string;
};

type TopicContextType = {
  topics: TopicType[];
  setTopics: (topics: TopicType[]) => void;
  isLoading: boolean;
};

const TopicContext = createContext<TopicContextType | null>(null);

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [topics, setTopics] = useState<TopicType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        setIsLoading(true);
        const data = await fetchMockTopics();
        setTopics(data);
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTopics();
  }, []);

  return (
    <TopicContext.Provider value={{ topics, setTopics, isLoading }}>
      {children}
    </TopicContext.Provider>
  );
}

export function useTopics() {
  const context = useContext(TopicContext);
  if (!context) {
    throw new Error('useTopics must be used within a TopicProvider');
  }
  return context;
}