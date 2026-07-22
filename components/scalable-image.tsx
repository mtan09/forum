import { Image, type ImageLoadEventData, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { Image as NativeImage } from 'react-native';

type ScalableImageProps = {
  source: any;
  type: 'width' | 'height';
  dimension: number;
  width?: number;
  height?: number;
} & Omit<ImageProps, 'source' | 'onLoad'>;

export default function ScalableImage({ source, type, dimension, width, height, style, ...props }: ScalableImageProps) {
  // A useful frame exists before remote media loads, so the feed does not
  // collapse or need a second network request just to discover dimensions.
  const fallbackDimension = type === 'width' ? dimension * 9 / 16 : dimension * 16 / 9;
  const sourceKey = typeof source === 'number' ? source : source?.uri;
  const [otherDimension, setOtherDimension] = useState(fallbackDimension);

  useEffect(() => {
    if (typeof sourceKey === 'number') {
      const { width: imgWidth, height: imgHeight } = NativeImage.resolveAssetSource(sourceKey);
      if (type === 'width') {
        setOtherDimension((dimension / imgWidth) * imgHeight);
      }
      else {
        setOtherDimension((dimension / imgHeight) * imgWidth);
      }
    } else {
      setOtherDimension(fallbackDimension);
    }
  }, [sourceKey, dimension, type, fallbackDimension]);

  // React Native's Image.getSize performs a separate remote size probe that
  // some publishers (including some The Hill image hosts) reject. Measuring
  // the image's real dimensions from its successful load avoids that warning.
  const handleLoad = (event: ImageLoadEventData) => {
    const { width: imgWidth, height: imgHeight } = event.source;
    if (imgWidth > 0 && imgHeight > 0) {
      setOtherDimension(
        type === 'width'
          ? (dimension / imgWidth) * imgHeight
          : (dimension / imgHeight) * imgWidth
      );
    }
  };

  return (
    <Image
      source={source}
      onLoad={handleLoad}
      cachePolicy="memory-disk"
      recyclingKey={typeof sourceKey === 'string' ? sourceKey : null}
      style={[
        type==='width' 
          ? { 
            width: dimension, 
            height: otherDimension 
            } 
          : {
            height: dimension,
            width: otherDimension
          }, 
        width != null || height != null ? { width, height } : undefined,
        style,
      ]}
      {...props}
    />
  );
}
