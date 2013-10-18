using System;
using System.Text;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Vidyano.Common;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public sealed class PersistentObjectAttributePresenter : ContentControl
    {
        public static readonly DependencyProperty IsEditingProperty = DependencyProperty.Register("IsEditing", typeof(bool), typeof(PersistentObjectAttributePresenter), new PropertyMetadata(false, AttributeStateChanged));
        public static readonly DependencyProperty IsReadOnlyProperty = DependencyProperty.Register("IsReadOnly", typeof(bool), typeof(PersistentObjectAttributePresenter), new PropertyMetadata(false, AttributeStateChanged));

        public PersistentObjectAttributePresenter()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributePresenter);

            SetBinding(IsEditingProperty, new Binding { Path = new PropertyPath("Parent.IsInEdit") });
            SetBinding(IsReadOnlyProperty, new Binding { Path = new PropertyPath("IsReadOnly") });

            IsTabStop = false;
        }

        public bool IsEditing
        {
            get
            {
                return (bool)GetValue(IsEditingProperty);
            }
            set
            {
                SetValue(IsEditingProperty, value);
            }
        }

        public bool IsReadOnly
        {
            get
            {
                return (bool)GetValue(IsReadOnlyProperty);
            }
            set
            {
                SetValue(IsReadOnlyProperty, value);
            }
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            Render();
        }

        protected override void OnPointerEntered(PointerRoutedEventArgs e)
        {
            VisualStateManager.GoToState(this, "PointerOver", false);
            base.OnPointerEntered(e);
        }

        protected override void OnPointerExited(PointerRoutedEventArgs e)
        {
            VisualStateManager.GoToState(this, "Normal", false);
            base.OnPointerExited(e);
        }

        private static void AttributeStateChanged(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var control = sender as PersistentObjectAttributePresenter;
            if (control != null)
                control.Render();
        }

        private void Render()
        {
            Content = DataContext;
            var poa = DataContext as PersistentObjectAttribute;
            if (poa != null)
            {
                var name = new StringBuilder("PersistentObjectAttributeTemplate");
                if (IsEditing)
                {
                    name.Append(".Edit");

                    if (IsReadOnly)
                        name.Append(".ReadOnly");
                }

                ContentTemplate = GetAttributeTemplate(name + ".{0}.{1}", poa.Parent.Type, poa.Name) ?? GetAttributeTemplate(name + ".{0}", poa.Type) ?? GetAttributeTemplate(name + ".Default");
            }
        }

        private static DataTemplate GetAttributeTemplate(string name, params object[] args)
        {
            object template;

            Application.Current.Resources.TryGetValue(string.Format(name, args), out template);

            return template as DataTemplate;
        }

        protected override async void OnTapped(TappedRoutedEventArgs e)
        {
            if (!e.Handled)
            {
                var source = e.OriginalSource as FrameworkElement;
                if (source != null)
                {
                    var attr = DataContext as PersistentObjectAttribute;
                    if (attr != null)
                    {
                        var args = new AttributeContextMenuArgs(attr);
                        ((StoreHooks)Service.Current.Hooks).AttributeContextMenu(args);
                        if (args.Commands.Count > 0)
                        {
                            if (args.AutoExecuteFirst && args.Commands.Count == 1)
                                args.Commands[0].Invoked(args.Commands[0]);
                            else
                            {
                                var popupMenu = new PopupMenu();
                                args.Commands.Run(popupMenu.Commands.Add);

                                var point = source.TransformToVisual(null).TransformPoint(e.GetPosition(this));
                                await popupMenu.ShowAsync(point);
                            }

                            e.Handled = true;
                        }
                    }
                }
            }

            base.OnTapped(e);
        }
    }
}