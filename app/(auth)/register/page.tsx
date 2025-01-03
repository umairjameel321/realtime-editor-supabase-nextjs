import SignUpForm from "@/components/SignUpForm";
import Link from "next/link";
import React from "react";

const SignUp = async () => {
  return (
    <div className="w-full flex mt-20 justify-center">
      <section className="flex flex-col w-[400px]">
        <h1 className="text-3xl w-full text-center font-bold mb-6">Sign Up</h1>
        <SignUpForm />
        <div className="mt-2 flex items-center">
          <h1>Already have an account?</h1>
          <Link className="font-bold ml-2" href="/login">
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SignUp;
