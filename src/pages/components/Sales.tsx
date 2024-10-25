import React from "react";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { CountUp } from "countup.js";

interface AnimatedProgressProps {
  value: number;
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({ value }) => {
  return (
    <div
      id="container"
      className="h-12 w-full bg-blue-100 rounded-full overflow-hidden border-4"
    >
      <div
        id="progress"
        className="transition-all duration-[2000ms] ease-in-out h-full rounded-md overflow-y-visible"
        style={{
          background:
            "linear-gradient(45deg,rgba(255, 255, 255, 0.5) 25%,transparent 25%,transparent 50%,rgba(255, 255, 255, 0.5) 50%,rgba(255, 255, 255, 0.5) 75%,transparent 75%,transparent)",
          backgroundSize: "40px 40px",
          backgroundColor: "var(--primary-pink)",
          width: `${value}%`,
          animation: "move 0.5s linear infinite",
        }}
      >
        <style jsx global>{`
          @keyframes move {
            100% {
              background-position: 40px 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

interface SalesProps {
  currentAmount: number;
  goalAmount: number;
  goalReached: boolean;
}

export default function Sales({
  currentAmount = 23,
  goalAmount = 100,
  goalReached = false,
}: SalesProps) {
  const percentage = Math.min(
    Math.round((currentAmount / goalAmount) * 100),
    100
  );

  const startPercentageVal = useRef(0);
  const startVal = useRef(0);
  const countupRef = useRef(null);
  const percentageRef = useRef(null);
  let countUpAnim: CountUp;
  let countUpPercentage: CountUp;
  const options = { decimalPlaces: 2, startVal: startVal.current };
  const percentageOptions = {
    decimalPlaces: 0,
    startVal: startPercentageVal.current,
  };

  useEffect(() => {
    if (!goalReached) return;
    const element = document.getElementById("container");
    if (!element) return;
    element.style.borderColor = "#16ade4";
  }, [goalReached]);

  useEffect(() => {
    if (currentAmount === 0) return;
    const element = document.getElementById("container");
    if (element) {
      element.classList.add("highlight");
      setTimeout(() => {
        element.classList.remove("highlight");
      }, 2000);
    }

    initCountUp(currentAmount);
  }, [currentAmount]);

  async function initCountUp(salesTotal: number) {
    if (salesTotal === 0) return;
    const countUpModule = await import("countup.js");
    if (countupRef.current && percentageRef.current) {
      countUpAnim = new countUpModule.CountUp(
        countupRef.current,
        salesTotal,
        options
      );
      countUpPercentage = new countUpModule.CountUp(
        percentageRef.current,
        percentage,
        percentageOptions
      );
      if (!countUpAnim.error) {
        countUpAnim.start();
        countUpPercentage.start();
        startVal.current = salesTotal;
        startPercentageVal.current = percentage;
      } else {
        console.error(countUpAnim.error);
      }
    } else {
      console.error("countupRef.current is null");
    }
  }

  return (
    <>
      {/* // Change the width here if u want to i.e. className w-3/4 etc*/}
      <div className="">
        <style jsx global>{`
          @keyframes candy-cane {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 40px 0;
            }
          }
          .animate-candy-cane {
            animation: candy-cane 1s linear infinite;
          }
        `}</style>
        <div className="">
          <Image
            src="https://maxandlily.com/cdn/shop/files/maxlily_bf8919cd-416f-4fb9-a72f-36a0cc30f605.png?height=400&v=1672769861"
            alt="Company Logo"
            width={600}
            height={200}
            className=" h-auto"
          />
        </div>
        <div className="w-full font-bold">
          <div className="justify-between w-full flex p-2 text-primary-pink">
            <div>
              <span className="text-lg ">Progress</span>
            </div>
            <div className="text-lg font-bold">
              <span ref={percentageRef}>0</span>
              <span>%</span>
            </div>
          </div>
          <AnimatedProgress value={percentage} />
          <div className="text-lg justify-between w-full flex p-2 text-primary-pink">
            <div>
              <span>Current: $</span>
              <span ref={countupRef}>{currentAmount}</span>
            </div>
            <span>Goal: $1,000,000</span>
          </div>
        </div>
      </div>
    </>
  );
}
