import { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';

type ScalableImageProps = {
  source: any;
  width: number;
} & ImageProps;

export default function ScalableImage({ source, width, style, ...props }: ScalableImageProps) {
  const [ height, setHeight ] = useState(0);

  useEffect(() => {
    if (typeof source === 'number') {
      const { width: imgWidth, height: imgHeight } = Image.resolveAssetSource(source);
      setHeight((width / imgWidth) * imgHeight);
    } else if (source.uri) {
      Image.getSize(source.uri, (imgWidth, imgHeight) => {
        setHeight((width / imgWidth) * imgHeight);
      });
    }
  }, [source, width]);

  return (
    <Image
      source={source}
      style={[{ width, height }, style]}
      {...props}
    />
  );
}