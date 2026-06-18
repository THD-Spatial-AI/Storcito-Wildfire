import axios from '@/lib/axios';

interface CountUsersResponse {
  success?: boolean;
  data?: {
    total?: number;
    online?: number;
  };
}

export async function getManagedUsersCount(): Promise<{ total: number; online: number }> {
  const { data } = await axios.get<CountUsersResponse>('/users/count');
  return {
    total: Number(data?.data?.total ?? 0),
    online: Number(data?.data?.online ?? 0),
  };
}
