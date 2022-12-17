import dynamic from "next/dynamic";

const ComponentWithNoSSR = dynamic(() => import("../components/Recording"), {
  ssr: false,
});

const InternalRecording = () => {
  return <ComponentWithNoSSR />;
};

export default InternalRecording;
