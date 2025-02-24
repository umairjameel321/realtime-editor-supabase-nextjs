import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";
import prisma from "@/utils/prisma/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user data:", userError.message);
        return NextResponse.redirect(`${origin}/error`);
      }

      // Check if user exists in user_profiles table
      const existingUser = await prisma.userProfile.findUnique({
        where: {
          email: data?.user?.email,
        },
      });

      if (!existingUser) {
        try {
          // Insert the new user into the user_profiles table
          await prisma.userProfile.create({
            data: {
              id: data?.user?.id as string,
              email: data?.user?.email as string,
              username: data?.user?.user_metadata?.username,
            },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (dbError: any) {
          console.error("Error inserting user data:", dbError.message);
          return NextResponse.redirect(`${origin}/error`);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
