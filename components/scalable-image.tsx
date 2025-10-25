import { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';

type ScalableImageProps = {
  source: any;
  type: 'width' | 'height';
  dimension: number;
} & ImageProps;

export default function ScalableImage({ source, type, dimension, style, ...props }: ScalableImageProps) {
  const [ otherDimension, setOtherDimension ] = useState(0);

  useEffect(() => {
    if (typeof source === 'number') {
      const { width: imgWidth, height: imgHeight } = Image.resolveAssetSource(source);
      if (type === 'width') {
        setOtherDimension((dimension / imgWidth) * imgHeight);
      }
      else {
        setOtherDimension((dimension / imgHeight) * imgWidth);
      }
    } else if (source.uri) {
      Image.getSize(source.uri, (imgWidth, imgHeight) => {
        if (type === 'width') {
          setOtherDimension((dimension / imgWidth) * imgHeight);
        }
        else {
          setOtherDimension((dimension / imgHeight) * imgWidth);
        }
      });
    }
  }, [source, dimension, type]);

  return (
    <Image
      source={source}
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
        style
      ]}
      {...props}
    />
  );
}