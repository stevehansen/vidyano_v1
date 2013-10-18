using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using Microsoft.Phone.Controls;
using Vidyano.Common;
using Vidyano.ViewModel;
using GestureEventArgs = System.Windows.Input.GestureEventArgs;

namespace Vidyano.View.Controls
{
    public sealed class PersistentObjectAttributePresenter : ContentControl
    {
        private static readonly DependencyProperty IsEditingProperty = DependencyProperty.Register("IsEditing", typeof(bool), typeof(PersistentObjectAttributePresenter), new PropertyMetadata(false, AttributeStateChanged));
        private static readonly DependencyProperty IsReadOnlyProperty = DependencyProperty.Register("IsReadOnly", typeof(bool), typeof(PersistentObjectAttributePresenter), new PropertyMetadata(false, AttributeStateChanged));
        public static readonly DependencyProperty LabelVisibilityProperty = DependencyProperty.Register("LabelVisibility", typeof(Visibility), typeof(PersistentObjectAttributePresenter), new PropertyMetadata(Visibility.Visible));

        public PersistentObjectAttributePresenter()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributePresenter);

            SetBinding(IsEditingProperty, new Binding { Path = new PropertyPath("Parent.IsInEdit") });
            SetBinding(IsReadOnlyProperty, new Binding { Path = new PropertyPath("IsReadOnly") });
            SetBinding(ContentProperty, new Binding());

            ContextMenuService.SetContextMenu(this, new ContextMenu());

            IsTabStop = false;
        }

        public Visibility LabelVisibility
        {
            get { return (Visibility)GetValue(LabelVisibilityProperty); }
            set { SetValue(LabelVisibilityProperty, value); }
        }

        protected override void OnContentChanged(object oldContent, object newContent)
        {
            base.OnContentChanged(oldContent, newContent);

            Render(newContent as PersistentObjectAttribute);
        }

        private static void AttributeStateChanged(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var control = sender as PersistentObjectAttributePresenter;
            if (control != null)
                control.Render(control.Content as PersistentObjectAttribute);
        }

        private void Render(PersistentObjectAttribute poa)
        {
            if (poa == null)
                return;

            var name = new StringBuilder("PersistentObjectAttributeTemplate");
            if (poa.Parent.IsInEdit && !poa.IsReadOnly)
            {
                name.Append(".Edit");

                if (poa.IsReadOnly)
                    name.Append(".ReadOnly");
            }

            ContentTemplate = GetAttributeTemplate(name + ".{0}.{1}", poa.Parent.Type, poa.Name) ?? GetAttributeTemplate(name + ".{0}", poa.Type) ?? GetAttributeTemplate(name + ".Default");
        }

        private static DataTemplate GetAttributeTemplate(string name, params object[] args)
        {
            return (DataTemplate)Application.Current.Resources[string.Format(name, args)];
        }

        protected override void OnTap(GestureEventArgs e)
        {
            HandleTapAndHold(e);

            if (!e.Handled)
                base.OnTap(e);
        }

        protected override void OnHold(GestureEventArgs e)
        {
            HandleTapAndHold(e, true);

            if (!e.Handled)
                base.OnHold(e);
        }

        private void HandleTapAndHold(GestureEventArgs e, bool alwaysOpen = false)
        {
            if (!e.Handled)
            {
                var source = e.OriginalSource as FrameworkElement;
                if (source != null)
                {
                    var attr = DataContext as PersistentObjectAttribute;
                    if (attr != null)
                    {
                        var menu = ContextMenuService.GetContextMenu(this);
                        if (menu.Items.Count > 0)
                            menu.Items.Clear();

                        var args = new AttributeContextMenuArgs(attr);
                        ((PhoneHooks)Service.Current.Hooks).AttributeContextMenu(args);
                        if (args.Commands.Count > 0)
                        {
                            if (!alwaysOpen && args.AutoExecuteFirst && args.Commands.Count == 1)
                                args.Commands[0].Action(attr);
                            else
                            {
                                args.Commands.Run(cmd =>
                                {
                                    var menuItem = new MenuItem { DataContext = cmd, Header = cmd.Text };
                                    menuItem.Click += (_, __) => cmd.Action(attr);
                                    menu.Items.Add(menuItem);
                                });

                                menu.IsOpen = true;
                            }
                        }

                        e.Handled = true;
                    }
                }
            }
        }
    }
}