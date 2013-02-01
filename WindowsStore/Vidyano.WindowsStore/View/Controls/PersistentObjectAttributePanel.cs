using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.ViewModel;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributePanel : Panel
    {
        public static readonly DependencyProperty GroupTemplateProperty = DependencyProperty.Register("GroupTemplate", typeof(DataTemplate), typeof(PersistentObjectAttributePanel), new PropertyMetadata(null));
        public static readonly DependencyProperty VerticalSpacingProperty = DependencyProperty.Register("VerticalSpacing", typeof(double), typeof(PersistentObjectAttributePanel), new PropertyMetadata(24d));
        public static readonly DependencyProperty HorizontalSpacingProperty = DependencyProperty.Register("HorizontalSpacing", typeof(double), typeof(PersistentObjectAttributePanel), new PropertyMetadata(24d));
        public static readonly DependencyProperty MinAttributeWidthProperty = DependencyProperty.Register("MinAttributeWidth", typeof(double), typeof(PersistentObjectAttributePanel), new PropertyMetadata(300d));

        private List<Tuple<FrameworkElement, Rect>> arranges = new List<Tuple<FrameworkElement, Rect>>();

        public DataTemplate GroupTemplate
        {
            get { return (DataTemplate)GetValue(GroupTemplateProperty); }
            set { SetValue(GroupTemplateProperty, value); }
        }

        public double VerticalSpacing
        {
            get { return (double)GetValue(VerticalSpacingProperty); }
            set { SetValue(VerticalSpacingProperty, value); }
        }

        public double HorizontalSpacing
        {
            get { return (double)GetValue(HorizontalSpacingProperty); }
            set { SetValue(HorizontalSpacingProperty, value); }
        }

        public double MinAttributeWidth
        {
            get { return (double)GetValue(MinAttributeWidthProperty); }
            set { SetValue(MinAttributeWidthProperty, value); }
        }

        protected override Size ArrangeOverride(Size finalSize)
        {
            arranges.Run(c => c.Item1.Arrange(c.Item2));

            return base.ArrangeOverride(finalSize);
        }

        protected override Size MeasureOverride(Size availableSize)
        {
            // Clean previous arranges, no matter what
            arranges.Clear();

            // Remove previous added attribute group children
            Children.OfType<ContentControl>().Where(cc => cc.Content is PersistentObjectAttributeGroup).Run(c => Children.Remove(c));

            // DataContext is not always guaranteed
            if (!Children.OfType<FrameworkElement>().All(c => c.DataContext is PersistentObjectAttribute))
                return new Size(0d, 0d);

            // Determine visible attributes, make sure others are hidden
            var attributes = Children.OfType<FrameworkElement>().Select(c => Tuple.Create<FrameworkElement, PersistentObjectAttribute>(c, (PersistentObjectAttribute)c.DataContext)).Where(attr =>
                {
                    attr.Item1.Measure(availableSize);
                    return attr.Item1.DesiredSize.Height > 0 && attr.Item1.DesiredSize.Width > 0;
                }).ToArray();

            if (attributes.Length == 0)
                return new Size(0d, 0d);

            // Create groups and optional group controls (if more than one group)
            var groupHeight = 0d;

            var attributesByGroup = attributes.GroupBy(attr => attr.Item2.Group).ToArray();
            var groups = attributesByGroup.Select(g =>
                {
                    ContentControl groupControl = null;
                    if (attributesByGroup.Length > 1)
                    {
                        groupControl = new ContentControl { Content = g.Key, ContentTemplate = GroupTemplate };
                        Children.Add(groupControl);
                        groupControl.Measure(availableSize);

                        if(groupControl.DesiredSize.Height + VerticalSpacing > groupHeight)
                            groupHeight = groupControl.DesiredSize.Height;
                    }

                    return Tuple.Create(groupControl, g.ToArray());
                }).ToArray();

            // Calculate sizes and positions
            var minHeight = attributes.Where(attr => attr.Item1.DesiredSize.Height > 0).Min(attr => attr.Item1.DesiredSize.Height) + VerticalSpacing;
            var maxTop = 0d;
            var maxWidth = 0d;
            var top = 0d;
            var left = 0d;

            groups.Run(g =>
                {
                    var childrenInThisColumn = new List<Tuple<FrameworkElement, Rect>>();
                    var colWidth = 0d;

                    if (g.Item1 != null)
                    {
                        childrenInThisColumn.Add(Tuple.Create(g.Item1 as FrameworkElement, new Rect(left, top, g.Item1.DesiredSize.Width, g.Item1.DesiredSize.Height)));
                        colWidth = g.Item1.DesiredSize.Width;
                        top += groupHeight;
                    }

                    g.Item2.Run(attr =>
                        {
                            var height = attr.Item1.DesiredSize.Height <= minHeight ? minHeight : Math.Ceiling(attr.Item1.DesiredSize.Height / minHeight) * minHeight;
                            height -= VerticalSpacing;

                            if (top + height > availableSize.Height && double.IsInfinity(availableSize.Width))
                            {
                                top = groupHeight;
                                left += Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth)) + HorizontalSpacing;
                                maxWidth += Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth)) + HorizontalSpacing;

                                childrenInThisColumn.Run(c => arranges.Add(Tuple.Create(c.Item1, new Rect(c.Item2.X, c.Item2.Y, Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth)), c.Item2.Height))));
                                childrenInThisColumn.Clear();

                                colWidth = 0d;
                                top = groupHeight;
                            }
                            else if(top + height > maxTop)
                                maxTop = top + height;

                            var width = Math.Min(MinAttributeWidth, availableSize.Width);
                            childrenInThisColumn.Add(Tuple.Create(attr.Item1, new Rect(left, top, width, attr.Item1.DesiredSize.Height)));

                            top += height + VerticalSpacing;
                            if (width > colWidth)
                                colWidth = width;
                        });

                    childrenInThisColumn.Run(c => arranges.Add(Tuple.Create(c.Item1, new Rect(c.Item2.X, c.Item2.Y, Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth)), c.Item2.Height))));
                    childrenInThisColumn.Clear();

                    if (double.IsInfinity(availableSize.Width))
                    {
                        left += Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth)) + HorizontalSpacing;
                        top = 0d;
                    }

                    maxWidth += Math.Min(availableSize.Width, Math.Max(MinAttributeWidth, colWidth));
                });

            return new Size(maxWidth, maxTop);
        }
    }
}