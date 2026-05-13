import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type MeResponse } from '@/lib/api'

export function useAuth() {
  return useQuery<MeResponse | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.me()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: (data) => {
      qc.setQueryData(['auth', 'me'], data.user)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null)
      qc.clear()
    },
  })
}
