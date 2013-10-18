using System;
using System.Windows;
using System.Windows.Media;

namespace Vidyano
{
    public sealed class ApplicationColors : ResourceDictionary
    {
        private Color _Accent;
        private Color _AccentDark, _AccentExtraDark;
        private Color _AccentExtraLight;
        private Color _AccentLight;
        private Color _AccentSemiDark;
        private Color _AccentSemiLight;
        private Color _Contrast, _ContrastDark, _ContrastLight;

        public Color Accent
        {
            get { return _Accent; }
            set
            {
                _Accent = value;
                Add("ApplicationAccentColor", value);

                var hsl = ColorToHSLConverter.Convert(value);
                hsl.L *= 0.7M;
                AccentSemiDark = HSLToColorConverter.Convert(hsl);
                hsl.L *= 0.7M;
                AccentDark = HSLToColorConverter.Convert(hsl);
                hsl.L *= 0.7M;
                AccentExtraDark = HSLToColorConverter.Convert(hsl);

                hsl = ColorToHSLConverter.Convert(value);
                hsl.L *= 1.25M;
                AccentSemiLight = HSLToColorConverter.Convert(hsl);
                hsl.L *= 1.25M;
                AccentLight = HSLToColorConverter.Convert(hsl);
                hsl.L *= 1.25M;
                AccentExtraLight = HSLToColorConverter.Convert(hsl);
            }
        }

        public Color AccentSemiDark
        {
            get { return _AccentSemiDark; }
            set
            {
                _AccentSemiDark = value;
                Add("ApplicationAccentColorSemiDark", value);
            }
        }

        public Color AccentDark
        {
            get { return _AccentDark; }
            set
            {
                _AccentDark = value;
                Add("ApplicationAccentColorDark", value);
            }
        }

        public Color AccentExtraDark
        {
            get { return _AccentExtraDark; }
            set
            {
                _AccentExtraDark = value;
                Add("ApplicationAccentColorExtraDark", value);
            }
        }

        public Color AccentSemiLight
        {
            get { return _AccentSemiLight; }
            set
            {
                _AccentSemiLight = value;
                Add("ApplicationAccentColorSemiLight", value);
            }
        }

        public Color AccentLight
        {
            get { return _AccentLight; }
            set
            {
                _AccentLight = value;
                Add("ApplicationAccentColorLight", value);
            }
        }

        public Color AccentExtraLight
        {
            get { return _AccentExtraLight; }
            set
            {
                _AccentExtraLight = value;
                Add("ApplicationAccentColorExtraLight", value);
            }
        }

        public Color Contrast
        {
            get { return _Contrast; }
            set
            {
                _Contrast = value;

                Add("ApplicationContrastColor", value);

                var hsl = ColorToHSLConverter.Convert(value);
                hsl.L *= 0.7M;
                ContrastDark = HSLToColorConverter.Convert(hsl);
                hsl = ColorToHSLConverter.Convert(value);
                hsl.L *= 1.25M;
                ContrastLight = HSLToColorConverter.Convert(hsl);
            }
        }

        public Color ContrastDark
        {
            get { return _ContrastDark; }
            set
            {
                _ContrastDark = value;
                Add("ApplicationContrastColorDark", value);
            }
        }

        public Color ContrastLight
        {
            get { return _ContrastLight; }
            set
            {
                _ContrastLight = value;
                Add("ApplicationContrastColorLight", value);
            }
        }

        #region HSL/RGB Conversion

        private static class ColorToHSLConverter
        {
            public static HSL Convert(Color color)
            {
                var hsl = new HSL();
                var rgb = GetRGBFromColor(color);

                var max = Math.Max(Math.Max(rgb.R, rgb.G), rgb.B);
                var min = Math.Min(Math.Min(rgb.R, rgb.G), rgb.B);
                var chroma = max - min;

                hsl.L = GetL(max, min);

                if (chroma != 0)
                {
                    hsl.H = GetH(rgb, max, chroma);
                    hsl.S = GetS(hsl.L, chroma);
                }
                return hsl;
            }

            private static RGB GetRGBFromColor(Color color)
            {
                var rgb = new RGB();
                rgb.R = color.R / 255M;
                rgb.G = color.G / 255M;
                rgb.B = color.B / 255M;
                return rgb;
            }

            private static decimal GetL(decimal max, decimal min)
            {
                return (max + min) / 2M;
            }

            private static decimal GetH(RGB rgb, decimal max, decimal chroma)
            {
                decimal h;
                if (rgb.R == max)
                    h = ((rgb.G - rgb.B) / chroma);
                else if (rgb.G == max)
                    h = ((rgb.B - rgb.R) / chroma) + 2M;
                else
                    h = ((rgb.R - rgb.G) / chroma) + 4M;
                return 60M * ((h + 6M) % 6M);
            }

            private static decimal GetS(decimal l, decimal chroma)
            {
                return l <= 0.5M ? chroma / (l * 2M) : chroma / (2M - 2M * l);
            }
        }

        private sealed class HSL
        {
            public decimal H { get; set; }
            public decimal S { get; set; }
            public decimal L { get; set; }
        }

        private static class HSLToColorConverter
        {
            public static Color Convert(HSL hsl)
            {
                var rgb = new RGB();

                if (hsl.S == 0M)
                    rgb.R = rgb.G = rgb.B = hsl.L;
                else
                    rgb = GetRGBFromHSLWithChroma(hsl);

                return rgb.ToColor();
            }

            private static RGB GetRGBFromHSLWithChroma(HSL hsl)
            {
                decimal min, max, h;

                h = hsl.H / 360M;

                max = hsl.L < 0.5M ? hsl.L * (1 + hsl.S) : (hsl.L + hsl.S) - (hsl.L * hsl.S);
                min = (hsl.L * 2M) - max;

                var rgb = new RGB();
                rgb.R = ComponentFromHue(min, max, h + (1M / 3M));
                rgb.G = ComponentFromHue(min, max, h);
                rgb.B = ComponentFromHue(min, max, h - (1M / 3M));
                return rgb;
            }

            private static decimal ComponentFromHue(decimal m1, decimal m2, decimal h)
            {
                h = (h + 1M) % 1M;
                if ((h * 6M) < 1)
                    return m1 + (m2 - m1) * 6M * h;
                if ((h * 2M) < 1)
                    return m2;
                if ((h * 3M) < 2)
                    return m1 + (m2 - m1) * ((2M / 3M) - h) * 6M;
                return m1;
            }
        }

        private sealed class RGB
        {
            public decimal R { get; set; }
            public decimal G { get; set; }
            public decimal B { get; set; }

            public Color ToColor()
            {
                var r = (byte)Math.Round(Math.Min(R, 1.0M) * 255M);
                var g = (byte)Math.Round(Math.Min(G, 1.0M) * 255M);
                var b = (byte)Math.Round(Math.Min(B, 1.0M) * 255M);
                return Color.FromArgb(255, r, g, b);
            }
        }

        #endregion
    }
}