import { useState, useEffect } from "react";
import Image from "next/image";
import BlockContent from "@sanity/block-content-to-react";
import { createImageUrlBuilder } from "@sanity/image-url";
import { Toolbar } from "../../components/toolbar";
import styles from "../../styles/Post.module.css";

const serializers = {
  types: {
    block: (props) => (
      <div className={styles.blockContent}>{props.children}</div>
    ),
    image: (props) => (
      <div className={styles.imageWrapper}>
        <Image
          src={createImageUrlBuilder({
            projectId: "u6uw5l6m",
            dataset: "production",
          })
            .image(props.node)
            .url()}
          alt={props.node.alt || ""}
          width={500}
          height={300}
          priority
        />
      </div>
    ),
  },
};

const Post = ({ title, body, image }) => {
  const [imageUrl, setImageUrl] = useState("");
  console.log("Props received:", { title, body, image });

  useEffect(() => {
    if (image) {
      const imgBuilder = createImageUrlBuilder({
        projectId: "u6uw5l6m",
        dataset: "production",
      });

      try {
        const url = imgBuilder.image(image).url();
        console.log("Generated image URL:", url);
        setImageUrl(url);
      } catch (error) {
        console.error("Error generating image URL:", error);
      }
    }
  }, [image]);

  return (
    <div>
      <Toolbar />
      <div className={styles.unset_img}>
        <h1>{title}</h1>
        {imageUrl && (
          <Image
            className={styles.mainImage}
            src={imageUrl}
            alt="main image"
            width={500}
            height={500}
            priority
          />
        )}

        <div className={styles.body}>
          <BlockContent blocks={body} serializers={serializers} />
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (pageContext) => {
  const pageSlug = pageContext.query.slug;

  if (!pageSlug) {
    return {
      notFound: true,
    };
  }

  const query = encodeURIComponent(
    `*[ _type == "post" && slug.current == "${pageSlug}" ]{
      ...,
      mainImage->
    }`
  );
  const url = `https://u6uw5l6m.api.sanity.io/v1/data/query/production?query=${query}`;

  try {
    const result = await fetch(url).then((res) => res.json());
    console.log("Sanity API Response:", result);
    const post = result.result[0];
    console.log("Post data:", post);

    if (!post) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        title: post.title || "",
        body: post.body || [],
        image: post.mainImage || null,
      },
    };
  } catch (error) {
    console.error("Error fetching from Sanity:", error);
    return {
      notFound: true,
    };
  }
};

export default Post;
