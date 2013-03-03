using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Windows.UI;
using Windows.UI.Xaml;

namespace Vidyano
{
    public class ApplicationColors : NotifyableBase
    {
        private static ColorToHSLConverter rgbToHsl = new ColorToHSLConverter();
        private static HSLToColorConverter hslToRgb = new HSLToColorConverter();

        private Color _Accent, _AccentSemiDark, _AccentDark, _AccentExtraDark, _AccentSemiLight, _AccentLight, _AccentExtraLight;
        private Color _Contrast, _ContrastDark, _ContrastLight;

        public ApplicationColors()
        {
            Accent = Colors.Green;
            Contrast = Colors.Red;
        }

        public Color Accent
        {
            get { return _Accent; }
            set
            {
                if (SetProperty(ref _Accent, value))
                {
                    Application.Current.Resources["ApplicationAccentColor"] = value;

                    var hsl = rgbToHsl.Convert(value);
                    hsl.L *= 0.7M;
                    AccentSemiDark = hslToRgb.Convert(hsl);
                    hsl.L *= 0.7M;
                    AccentDark = hslToRgb.Convert(hsl);
                    hsl.L *= 0.7M;
                    AccentExtraDark = hslToRgb.Convert(hsl);

                    hsl = rgbToHsl.Convert(value);
                    hsl.L *= 1.25M;
                    AccentSemiLight = hslToRgb.Convert(hsl);
                    hsl.L *= 1.25M;
                    AccentLight = hslToRgb.Convert(hsl);
                    hsl.L *= 1.25M;
                    AccentExtraLight = hslToRgb.Convert(hsl);
                }
            }
        }

        public Color AccentSemiDark
        {
            get { return _AccentSemiDark; }
            set
            {
                if (SetProperty(ref _AccentSemiDark, value))
                    Application.Current.Resources["ApplicationAccentColorSemiDark"] = value;
            }
        }

        public Color AccentDark
        {
            get { return _AccentDark; }
            set
            {
                if (SetProperty(ref _AccentDark, value))
                    Application.Current.Resources["ApplicationAccentColorDark"] = value;
            }
        }

        public Color AccentExtraDark
        {
            get { return _AccentExtraDark; }
            set
            {
                if (SetProperty(ref _AccentExtraDark, value))
                    Application.Current.Resources["ApplicationAccentColorExtraDark"] = value;
            }
        }

        public Color AccentSemiLight
        {
            get { return _AccentSemiLight; }
            set
            {
                if (SetProperty(ref _AccentSemiLight, value))
                    Application.Current.Resources["ApplicationAccentColorSemiLight"] = value;
            }
        }

        public Color AccentLight
        {
            get { return _AccentLight; }
            set
            {
                if (SetProperty(ref _AccentLight, value))
                    Application.Current.Resources["ApplicationAccentColorLight"] = value;
            }
        }

        public Color AccentExtraLight
        {
            get { return _AccentExtraLight; }
            set
            {
                if (SetProperty(ref _AccentExtraLight, value))
                    Application.Current.Resources["ApplicationAccentColorExtraLight"] = value;
            }
        }

        public Color Contrast
        {
            get { return _Contrast; }
            set
            {
                if (SetProperty(ref _Contrast, value))
                {
                    Application.Current.Resources["ApplicationContrastColor"] = value;

                    var hsl = rgbToHsl.Convert(value);
                    hsl.L *= 0.7M;
                    ContrastDark = hslToRgb.Convert(hsl);
                    hsl = rgbToHsl.Convert(value);
                    hsl.L *= 1.25M;
                    ContrastLight = hslToRgb.Convert(hsl);
                }
            }
        }

        public Color ContrastDark
        {
            get { return _ContrastDark; }
            set
            {
                if (SetProperty(ref _ContrastDark, value))
                    Application.Current.Resources["ApplicationContrastColorDark"] = value;
            }
        }

        public Color ContrastLight
        {
            get { return _ContrastLight; }
            set
            {
                if (SetProperty(ref _ContrastLight, value))
                    Application.Current.Resources["ApplicationContrastColorLight"] = value;
            }
        }

        #region HSL/RGB Conversion

        class HSL
        {
            public decimal H { get; set; }
            public decimal S { get; set; }
            public decimal L { get; set; }
        }

        class RGB
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

        class HSLToColorConverter
        {
            public Color Convert(HSL hsl)
            {
                RGB rgb = new RGB();

                if (hsl.S == 0M)
                    rgb.R = rgb.G = rgb.B = hsl.L;
                else
                    rgb = GetRGBFromHSLWithChroma(hsl);

                return rgb.ToColor();
            }

            private RGB GetRGBFromHSLWithChroma(HSL hsl)
            {
                decimal min, max, h;

                h = hsl.H / 360M;

                max = hsl.L < 0.5M ? hsl.L * (1 + hsl.S) : (hsl.L + hsl.S) - (hsl.L * hsl.S);
                min = (hsl.L * 2M) - max;

                RGB rgb = new RGB();
                rgb.R = ComponentFromHue(min, max, h + (1M / 3M));
                rgb.G = ComponentFromHue(min, max, h);
                rgb.B = ComponentFromHue(min, max, h - (1M / 3M));
                return rgb;
            }

            private decimal ComponentFromHue(decimal m1, decimal m2, decimal h)
            {
                h = (h + 1M) % 1M;
                if ((h * 6M) < 1)
                    return m1 + (m2 - m1) * 6M * h;
                else if ((h * 2M) < 1)
                    return m2;
                else if ((h * 3M) < 2)
                    return m1 + (m2 - m1) * ((2M / 3M) - h) * 6M;
                else
                    return m1;
            }
        }


        class ColorToHSLConverter
        {
            public HSL Convert(Color color)
            {
                HSL hsl = new HSL();
                RGB rgb = GetRGBFromColor(color);

                decimal max = Math.Max(Math.Max(rgb.R, rgb.G), rgb.B);
                decimal min = Math.Min(Math.Min(rgb.R, rgb.G), rgb.B);
                decimal chroma = max - min;

                hsl.L = GetL(max, min);

                if (chroma != 0)
                {
                    hsl.H = GetH(rgb, max, chroma);
                    hsl.S = GetS(hsl.L, chroma);
                }
                return hsl;
            }

            private RGB GetRGBFromColor(Color color)
            {
                RGB rgb = new RGB();
                rgb.R = color.R / 255M;
                rgb.G = color.G / 255M;
                rgb.B = color.B / 255M;
                return rgb;
            }

            private decimal GetL(decimal max, decimal min)
            {
                return (max + min) / 2M;
            }

            private decimal GetH(RGB rgb, decimal max, decimal chroma)
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

            private decimal GetS(decimal l, decimal chroma)
            {
                return l <= 0.5M ? chroma / (l * 2M) : chroma / (2M - 2M * l);
            }
        }

        #endregion
    }
}