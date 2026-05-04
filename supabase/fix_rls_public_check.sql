-- VANGUARD: RLS Fix for Public Email Checking
-- 이 명령을 Supabase SQL Editor에서 실행하면 비로그인 사용자도 가입 여부를 확인할 수 있습니다.

-- 1. 기존 정책 제거 (선택 사항)
-- DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;

-- 2. 새로운 정책: 자신의 프로필은 모든 필드 조회 가능, 타인 프로필은 가입 여부(email)만 확인 가능하도록 설정
-- 하지만 RLS는 컬럼 단위가 아니므로, 가장 안전한 방법은 '이메일이 존재하는지'만 확인하는 정책을 추가하는 것입니다.

CREATE POLICY "Allow public email search" ON public.profiles
FOR SELECT
USING (true);

-- 주의: 위 정책은 모든 사용자가 모든 프로필 정보를 읽을 수 있게 합니다. 
-- 보안을 위해 특정 컬럼만 노출하고 싶다면 RPC(Remote Procedure Call)를 사용하는 것이 좋습니다.
