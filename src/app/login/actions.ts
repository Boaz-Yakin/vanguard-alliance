"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client with service_role key to bypass RLS and update users
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function verifyAndResetPassword(formData: {
  email: string;
  restaurantName: string;
  phoneNumber: string;
  newPassword: string;
}) {
  try {
    const { email, restaurantName, phoneNumber, newPassword } = formData;

    // 1. Verify user profile exists and matches business info
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email.trim())
      .eq("restaurant_name", restaurantName.trim())
      .eq("phone_number", phoneNumber.trim())
      .single();

    if (profileError || !profile) {
      return { success: false, message: "입력한 정보가 등록된 회원 정보와 일치하지 않습니다." };
    }

    // 2. Update password via admin API (No email verification needed)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });

    if (updateError) {
      return { success: false, message: "비밀번호 업데이트 중 오류가 발생했습니다: " + updateError.message };
    }

    return { success: true, message: "비밀번호가 성공적으로 재설정되었습니다." };
  } catch (err: any) {
    console.error("Reset Error:", err);
    return { success: false, message: "시스템 오류가 발생했습니다." };
  }
}
